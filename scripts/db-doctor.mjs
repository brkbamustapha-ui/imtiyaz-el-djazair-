#!/usr/bin/env node
/**
 * Answers one question: does the database the app actually reads have the
 * tables the app expects?
 *
 *   npm run db:doctor           inspect and report
 *   npm run db:doctor -- --fix  inspect, repair if needed, inspect again
 *
 * Credentials are never printed. Passwords are masked, and nothing here writes
 * to a log or a file.
 *
 * Why this exists: `prisma migrate deploy` runs through DIRECT_URL, but the
 * deployed app queries through DATABASE_URL. If those two point at different
 * databases the migration reports success and the site still fails — the
 * failure looks like a migration problem and is really an address problem.
 * So every check below is run through BOTH, and the report says which is which.
 */
import { PrismaClient } from "@prisma/client";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const B = "\x1b[1m", R = "\x1b[31m", G = "\x1b[32m", Y = "\x1b[33m", D = "\x1b[2m", O = "\x1b[0m";
// Declared before the flags below so every helper can consult it.
const QUIET = process.argv.includes("--summary");
const say = (...a) => { if (!QUIET) console.log(...a); };
const ok = (m) => say(`  ${G}✓${O} ${m}`);
const bad = (m) => say(`  ${R}✗${O} ${m}`);
const warn = (m) => say(`  ${Y}!${O} ${m}`);
const head = (m) => say(`\n${B}${m}${O}`);

const FIX = process.argv.includes("--fix");
const BASELINE = "20260827000000_init";

// --from-file reads the file `vercel env pull` writes, so production can be
// checked without those values ever being typed out or stored in .env.
//
// It is NOT called --env-file: node has a flag by that name and swallows it,
// failing with a bare "node: <file>: not found" before this script ever runs.
// The old spelling is still accepted — if it reaches us the file exists — but
// --from-file is the one that behaves the same whether the file is there or not.
function flagValue(...names) {
  for (const name of names) {
    const i = process.argv.indexOf(name);
    if (i !== -1) return process.argv[i + 1] ?? null;
  }
  return null;
}
const ENV_FILE = flagValue("--from-file", "--env-file");
// --summary prints only the four lines, nothing else. Everything the full
// report shows is still computed; only the printing is suppressed.
const SUMMARY = process.argv.includes("--summary");
// --rm-env-file deletes it afterwards: production credentials should not sit on
// a laptop any longer than the check that needed them.
const RM_ENV_FILE = process.argv.includes("--rm-env-file") || process.argv.includes("--rm-file");

// ---------------------------------------------------------------- env loading
// Prisma loads .env itself, but this script needs the raw strings to compare
// them, so read the file directly when the variables are not already exported.
function loadEnv(file, override) {
  if (!fs.existsSync(file)) return false;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    if (override || process.env[k] === undefined) process.env[k] = v;
  }
  return true;
}

if (ENV_FILE) {
  const resolved = path.resolve(process.cwd(), ENV_FILE);
  // Describe ONE environment, never a blend of two. Anything inherited from the
  // shell or .env is cleared first: a production DATABASE_URL reported next to a
  // development DIRECT_URL reads as a mismatch that does not exist.
  delete process.env.DATABASE_URL;
  delete process.env.DIRECT_URL;
  // An explicitly named file is the whole point of the run, so it wins over
  // anything already in the shell or in .env.
  if (!loadEnv(resolved, true)) {
    console.log(`\x1b[31mNo such file: ${ENV_FILE}\x1b[0m`);
    console.log(`Run  vercel env pull ${ENV_FILE} --environment=production  first.`);
    console.log(`(If you typed --env-file, use --from-file: node claims --env-file for itself.)`);
    process.exit(1);
  }
} else {
  loadEnv(path.join(process.cwd(), ".env"), false);
}

/** Split a connection string into its parts. The password is never returned. */
function describe(raw) {
  if (!raw) return null;
  let u;
  try { u = new URL(raw); } catch { return { invalid: true }; }
  const params = u.searchParams;
  return {
    host: u.hostname,
    port: u.port || "5432",
    database: u.pathname.replace(/^\//, "") || "(default)",
    schema: params.get("schema") || "public",
    user: u.username || "(none)",
    hasPassword: u.password !== "",
    pgbouncer: params.get("pgbouncer") === "true",
    // What identifies "the same database": host, port and database name.
    identity: `${u.hostname}:${u.port || "5432"}/${u.pathname}`,
  };
}

function show(label, note, d) {
  say(`  ${B}${label}${O} ${D}${note}${O}`);
  if (!d) return bad("    not set");
  if (d.invalid) return bad("    not a valid connection string");
  say(`    host      ${d.host}`);
  say(`    port      ${d.port}${d.port === "6543" ? `  ${D}(Supabase transaction pooler)${O}` : d.port === "5432" ? `  ${D}(direct)${O}` : ""}`);
  say(`    database  ${d.database}`);
  say(`    schema    ${d.schema}`);
  say(`    user      ${d.user}`);
  say(`    password  ${d.hasPassword ? "******** (set)" : `${R}not set${O}`}`);
}

/** Inspect one connection. Returns null when it cannot connect. */
async function inspect(url, schema) {
  const db = new PrismaClient({ datasources: { db: { url } }, log: [] });
  try {
    const [{ current_database, current_schema }] = await db.$queryRawUnsafe(
      "SELECT current_database()::text AS current_database, current_schema()::text AS current_schema",
    );
    // Identity has to come from the server, not the URL: Supabase gives one
    // database two hostnames (pooled 6543, direct 5432), and comparing strings
    // would call that correct setup a mismatch. The cluster's system_identifier
    // is exact; where it is not readable, database oid + postmaster start time
    // is a good enough fingerprint and needs no special privilege.
    let fingerprint;
    try {
      const [r] = await db.$queryRawUnsafe("SELECT system_identifier::text AS id FROM pg_control_system()");
      fingerprint = `sys:${r.id}/${current_database}`;
    } catch {
      const [r] = await db.$queryRawUnsafe(
        `SELECT (SELECT oid FROM pg_database WHERE datname = current_database())::text AS oid,
                pg_postmaster_start_time()::text AS started`,
      );
      fingerprint = `oid:${r.oid}/${r.started}/${current_database}`;
    }
    const tables = await db.$queryRawUnsafe(
      "SELECT table_name::text AS t FROM information_schema.tables WHERE table_schema = $1 ORDER BY 1", schema,
    );
    // Look for the table in EVERY schema, not just the expected one: "it exists
    // but somewhere else" is a different problem from "it was never created".
    const anywhere = await db.$queryRawUnsafe(
      "SELECT table_schema::text AS s FROM information_schema.tables WHERE table_name = 'StoredFile'",
    );
    let migrations = null;
    try {
      migrations = await db.$queryRawUnsafe(
        `SELECT migration_name::text AS name, (finished_at IS NOT NULL) AS done, (rolled_back_at IS NOT NULL) AS rolled_back
         FROM "${schema}"._prisma_migrations ORDER BY started_at`,
      );
    } catch { /* table absent: this database has no migration history */ }
    return {
      fingerprint,
      currentDatabase: current_database,
      currentSchema: current_schema,
      tables: tables.map((r) => r.t),
      storedFileSchemas: anywhere.map((r) => r.s),
      migrations,
    };
  } catch (error) {
    // Prisma messages start with a blank line, so taking split("\n")[0] yields ""
    // — falsy, which made a failed connection report as a successful one. Take
    // the first line that actually has text.
    const lines = String(error?.message ?? error)
      .split("\n").map((line) => line.trim()).filter(Boolean);
    // The first line is Prisma's generic "Invalid ... invocation:" preamble.
    // The reason — wrong password, no such database, host unreachable — is
    // further down, and it is the only part worth showing.
    const message = lines.find((line) => !/^Invalid `prisma|^invocation:?$/i.test(line))
      ?? lines[0] ?? "unknown error";
    return { error: message.slice(0, 200) };
  } finally {
    await db.$disconnect().catch(() => undefined);
  }
}

function report(label, state, schema) {
  head(label);
  if (!state) { bad("not checked"); return false; }
  // Belt and braces: a state without tables is a failed inspection whatever the
  // error field says, and must never be rendered as a successful connection.
  if (state.error || !state.tables) {
    bad(`cannot connect — ${state.error ?? "the inspection returned nothing"}`);
    return false;
  }
  ok(`connected to database "${state.currentDatabase}"`);
  say(`    tables in schema "${schema}": ${state.tables.length}`);

  const here = state.storedFileSchemas.includes(schema);
  if (here) ok(`public.StoredFile EXISTS`);
  else if (state.storedFileSchemas.length) {
    bad(`StoredFile is NOT in "${schema}" — it is in: ${state.storedFileSchemas.join(", ")}`);
    warn(`the app looks in "${schema}", so it cannot see it`);
  } else bad(`StoredFile does not exist in this database, in any schema`);

  if (!state.migrations) warn(`_prisma_migrations is absent — this database has no migration history`);
  else {
    say(`    migration history (${state.migrations.length}):`);
    for (const m of state.migrations) {
      const mark = m.rolled_back ? `${R}rolled back${O}` : m.done ? `${G}applied${O}` : `${Y}started, not finished${O}`;
      say(`      ${m.name}  ${mark}`);
    }
  }
  return here;
}

// ------------------------------------------------------------------- run
say(`${B}Database doctor${O} ${D}— credentials are never printed${O}`);

const appUrl = process.env.DATABASE_URL;
const migUrl = process.env.DIRECT_URL;
const app = describe(appUrl);
const mig = describe(migUrl);

head("Connection strings");
show("DATABASE_URL", "— the deployed app queries through this", app);
say();
if (mig) {
  show("DIRECT_URL", "— migrations run through this", mig);
} else {
  say(`  ${B}DIRECT_URL${O} ${D}— migrations run through this${O}`);
  say(`    ${D}not in this file — checking through DATABASE_URL alone, which is${O}`);
  say(`    ${D}enough to answer whether the table exists. --fix would need it.${O}`);
}

if (!app || app.invalid) {
  say(`\n${R}${B}DATABASE_URL is not set, or is not a valid connection string.${O}`);
  process.exit(1);
}
if (mig?.invalid) {
  say(`\n${R}${B}DIRECT_URL is set but is not a valid connection string.${O}`);
  process.exit(1);
}

// A local database says nothing about a deployed site. Without this the report
// can read as a verdict on production while it is describing a laptop.
const LOCAL = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);
const isLocal = LOCAL.has(app.host);
if (isLocal) {
  head("Careful — this is a local database");
  warn(`DATABASE_URL points at ${app.host}, on this machine.`);
  say(`    Everything below describes that local database and says NOTHING`);
  say(`    about your deployed site. To check the database Vercel uses, run:`);
  say(`      ${B}DATABASE_URL="<your production string>" \\${O}`);
  say(`      ${B}DIRECT_URL="<your production string>" npm run db:doctor${O}`);
}

// Ask both servers who they are, rather than guessing from the two URLs.
const appState = await inspect(appUrl, app.schema);
const migState = mig ? await inspect(migUrl, mig.schema) : null;

let same = null;
if (!mig) {
  // Nothing to compare. Reporting on DATABASE_URL alone still answers the
  // question that matters: does the database the site reads have the table?
} else {
head("Do they point at the same database?");
if (appState.error || migState.error) {
  warn("cannot tell — one of them did not connect (see below)");
} else if (appState.fingerprint === migState.fingerprint) {
  same = true;
  ok("yes — both connections reach the same database");
  if (app.host !== mig.host) {
    say(`    ${D}(different hostnames, one database — normal on Supabase: the pooled${O}`);
    say(`    ${D}endpoint and the direct one are two doors into the same place)${O}`);
  }
} else {
  same = false;
  bad("NO — these are genuinely two different databases");
  say(`    DATABASE_URL -> ${app.host}:${app.port}/${app.database}`);
  say(`    DIRECT_URL   -> ${mig.host}:${mig.port}/${mig.database}`);
  warn("a migration applied through DIRECT_URL will never appear to the app");
}
if (app.schema !== mig.schema) {
  bad(`schema mismatch: app reads "${app.schema}", migrations write "${mig.schema}"`);
}
}

const appReachable = !appState.error && Boolean(appState.tables);
let viaApp = report(`Through DATABASE_URL — what the deployed site actually sees`, appState, app.schema);
if (mig && same !== true) report(`Through DIRECT_URL — where migrations land`, migState, mig.schema);

// ------------------------------------------------------------------- repair
if (!viaApp && FIX && !mig) {
  head("Repairing");
  bad("--fix needs DIRECT_URL as well — Prisma refuses to run migrations without it.");
  say(`    Add DIRECT_URL to the file, or pass it on the command line.`);
} else if (!viaApp && FIX) {
  head("Repairing");
  const run = (args) => {
    say(`  ${D}$ npx prisma ${args.join(" ")}${O}`);
    try {
      execFileSync("npx", ["prisma", ...args], { stdio: ["ignore", "pipe", "pipe"], env: process.env })
        .toString().split("\n").filter(Boolean).slice(-3).forEach((l) => console.log(`    ${l}`));
      return true;
    } catch (e) {
      const out = `${e.stdout ?? ""}${e.stderr ?? ""}`.split("\n").filter(Boolean).slice(-4);
      out.forEach((l) => console.log(`    ${R}${l}${O}`));
      return false;
    }
  };
  // Baselining only matters on a database that already has the tables. On an
  // empty one it would claim a migration ran that never did, so skip it there.
  const state = await inspect(migUrl, mig.schema);
  const hasTables = state && !state.error && state.tables.length > 0;
  const hasHistory = state && !state.error && state.migrations !== null;

  if (hasTables && !hasHistory) {
    say(`  ${D}database has tables but no history — baselining first${O}`);
    run(["migrate", "resolve", "--applied", BASELINE]);
  } else if (!hasTables) {
    say(`  ${D}database is empty — applying every migration${O}`);
  } else {
    say(`  ${D}history already present — applying what is pending${O}`);
  }
  run(["migrate", "deploy"]);

  head("Re-checking THROUGH DATABASE_URL (the one the site uses)");
  viaApp = report("Result", await inspect(appUrl, app.schema), app.schema);
}

// -------------------------------------------------------------- summary
/**
 * The four lines, and only those, when --summary is passed. Printed from the
 * same values the full report uses, so the two can never disagree.
 */
function printSummary(state, reachable) {
  if (!SUMMARY) return;
  const host = app?.host ?? "";
  const isSupabase = /(^|\.)supabase\.(co|com)$/i.test(host) || /supabase/i.test(host);

  const l1 = app && !app.invalid ? "présente" : "absente";
  const l2 = !app || app.invalid ? "indéterminé" : isSupabase ? `oui (${host})` : `non (${host})`;

  let l3;
  if (!reachable) l3 = "indéterminé — connexion impossible";
  else l3 = state.storedFileSchemas.includes(app.schema)
    ? "existe"
    : state.storedFileSchemas.length
      ? `n'existe pas dans "${app.schema}" (présente dans : ${state.storedFileSchemas.join(", ")})`
      : "n'existe pas";

  let l4;
  if (!reachable) l4 = "indéterminé — connexion impossible";
  else if (!state.migrations) l4 = "aucun historique (_prisma_migrations absente)";
  else if (state.migrations.length === 0) l4 = "historique présent mais vide";
  else {
    const done = state.migrations.filter((m) => m.done && !m.rolled_back);
    const pending = state.migrations.filter((m) => !m.done || m.rolled_back);
    l4 = pending.length === 0
      ? `${done.length}/${state.migrations.length} appliquées — ${done.map((m) => m.name).join(", ")}`
      : `${done.length}/${state.migrations.length} appliquées, en attente : ${pending.map((m) => m.name).join(", ")}`;
  }

  console.log(`DATABASE_URL Production : ${l1}`);
  console.log(`Base Production : ${l2}`);
  console.log(`public.StoredFile : ${l3}`);
  console.log(`Migrations : ${l4}`);
}

// -------------------------------------------------------------- clean up
// Production credentials should not outlive the check that needed them.
function removeEnvFile() {
  if (!RM_ENV_FILE || !ENV_FILE) return;
  const resolved = path.resolve(process.cwd(), ENV_FILE);
  try {
    // Overwrite before unlinking so the bytes are not left in a freed block.
    const size = fs.statSync(resolved).size;
    fs.writeFileSync(resolved, "\0".repeat(size));
    fs.unlinkSync(resolved);
    say(`\n  ${G}✓${O} ${ENV_FILE} overwritten and deleted`);
  } catch (e) {
    say(`\n  ${Y}!${O} could not delete ${ENV_FILE}: ${e.message}`);
    say(`    Delete it yourself — it holds production credentials.`);
  }
}

// ------------------------------------------------------------------- verdict
head("Verdict");
if (viaApp && isLocal) {
  say(`  ${Y}${B}The LOCAL database at ${app.host} has public.StoredFile.${O}`);
  say(`  ${Y}This tells you nothing about production.${O} Re-run with your production`);
  say(`  connection strings before deciding whether to redeploy.`);
  printSummary(appState, appReachable);
  removeEnvFile();
  process.exit(0);
}
if (viaApp) {
  say(`  ${G}${B}The database the app reads has public.StoredFile.${O}`);
  say(`  ${D}(host ${app.host} — check this is the host Vercel uses.)${O}`);
  say(`  You can redeploy on Vercel.`);
  say(`  ${D}If the runtime log still shows the old error afterwards, check its timestamp —${O}`);
  say(`  ${D}Vercel keeps previous logs, and an old line is not a new failure.${O}`);
  printSummary(appState, appReachable);
  removeEnvFile();
  process.exit(0);
}
if (!appReachable) {
  say(`  ${R}${B}Could not connect through DATABASE_URL at all.${O}`);
  say(`  This is not a migration problem — nothing can be applied or checked`);
  say(`  until the connection works. Common causes, in order:`);
  say(`    - the password in the string is wrong, or was rotated`);
  say(`    - the database name or host is not the one you think`);
  say(`    - the user has no rights on that database`);
  say(`    - the host refuses connections from your network`);
  say(`  Copy the string again from your provider, and check it is the value`);
  say(`  Vercel has for Production.`);
  printSummary(appState, appReachable);
  removeEnvFile();
  process.exit(1);
}
say(`  ${R}${B}The database the app reads does NOT have public.StoredFile.${O}`);
if (same === false) {
  say(`  The two URLs reach different databases. Fix that first: DATABASE_URL and`);
  say(`  DIRECT_URL must be two endpoints of the SAME database — on Supabase, the`);
  say(`  pooled string (port 6543) and the direct one (port 5432) of one project.`);
} else if (!FIX) {
  say(`  Run:  ${B}npm run db:doctor -- --fix${O}`);
  say(`  It baselines only if needed, applies the missing migration, and re-checks.`);
  say(`  It never drops or resets anything.`);
} else {
  say(`  The repair ran and the table is still missing. Read the errors above.`);
}
say(`\n  ${D}Also confirm these same two values are set in Vercel -> Settings ->${O}`);
say(`  ${D}Environment Variables for Production, and redeploy after changing them.${O}`);
printSummary(appState, appReachable);
removeEnvFile();
process.exit(1);
