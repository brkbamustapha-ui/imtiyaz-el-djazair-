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
const ok = (m) => console.log(`  ${G}✓${O} ${m}`);
const bad = (m) => console.log(`  ${R}✗${O} ${m}`);
const warn = (m) => console.log(`  ${Y}!${O} ${m}`);
const head = (m) => console.log(`\n${B}${m}${O}`);

const FIX = process.argv.includes("--fix");
const BASELINE = "20260827000000_init";

// ---------------------------------------------------------------- env loading
// Prisma loads .env itself, but this script needs the raw strings to compare
// them, so read the file directly when the variables are not already exported.
function loadEnv() {
  const file = path.join(process.cwd(), ".env");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    if (process.env[k] === undefined) process.env[k] = v;
  }
}
loadEnv();

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
  console.log(`  ${B}${label}${O} ${D}${note}${O}`);
  if (!d) return bad("    not set");
  if (d.invalid) return bad("    not a valid connection string");
  console.log(`    host      ${d.host}`);
  console.log(`    port      ${d.port}${d.port === "6543" ? `  ${D}(Supabase transaction pooler)${O}` : d.port === "5432" ? `  ${D}(direct)${O}` : ""}`);
  console.log(`    database  ${d.database}`);
  console.log(`    schema    ${d.schema}`);
  console.log(`    user      ${d.user}`);
  console.log(`    password  ${d.hasPassword ? "******** (set)" : `${R}not set${O}`}`);
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
    return { error: String(error?.message ?? error).split("\n")[0].slice(0, 160) };
  } finally {
    await db.$disconnect().catch(() => undefined);
  }
}

function report(label, state, schema) {
  head(label);
  if (!state) { bad("not checked"); return false; }
  if (state.error) { bad(`cannot connect — ${state.error}`); return false; }
  ok(`connected to database "${state.currentDatabase}"`);
  console.log(`    tables in schema "${schema}": ${state.tables.length}`);

  const here = state.storedFileSchemas.includes(schema);
  if (here) ok(`public.StoredFile EXISTS`);
  else if (state.storedFileSchemas.length) {
    bad(`StoredFile is NOT in "${schema}" — it is in: ${state.storedFileSchemas.join(", ")}`);
    warn(`the app looks in "${schema}", so it cannot see it`);
  } else bad(`StoredFile does not exist in this database, in any schema`);

  if (!state.migrations) warn(`_prisma_migrations is absent — this database has no migration history`);
  else {
    console.log(`    migration history (${state.migrations.length}):`);
    for (const m of state.migrations) {
      const mark = m.rolled_back ? `${R}rolled back${O}` : m.done ? `${G}applied${O}` : `${Y}started, not finished${O}`;
      console.log(`      ${m.name}  ${mark}`);
    }
  }
  return here;
}

// ------------------------------------------------------------------- run
console.log(`${B}Database doctor${O} ${D}— credentials are never printed${O}`);

const appUrl = process.env.DATABASE_URL;
const migUrl = process.env.DIRECT_URL;
const app = describe(appUrl);
const mig = describe(migUrl);

head("Connection strings");
show("DATABASE_URL", "— the deployed app queries through this", app);
console.log();
show("DIRECT_URL", "— migrations run through this", mig);

if (!app || !mig || app.invalid || mig.invalid) {
  console.log(`\n${R}${B}Both DATABASE_URL and DIRECT_URL must be set.${O} Put them in .env, then run this again.`);
  process.exit(1);
}

// A local database says nothing about a deployed site. Without this the report
// can read as a verdict on production while it is describing a laptop.
const LOCAL = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);
const isLocal = LOCAL.has(app.host);
if (isLocal) {
  head("Careful — this is a local database");
  warn(`DATABASE_URL points at ${app.host}, on this machine.`);
  console.log(`    Everything below describes that local database and says NOTHING`);
  console.log(`    about your deployed site. To check the database Vercel uses, run:`);
  console.log(`      ${B}DATABASE_URL="<your production string>" \\${O}`);
  console.log(`      ${B}DIRECT_URL="<your production string>" npm run db:doctor${O}`);
}

// Ask both servers who they are, rather than guessing from the two URLs.
const appState = await inspect(appUrl, app.schema);
const migState = await inspect(migUrl, mig.schema);

head("Do they point at the same database?");
let same = null;
if (appState.error || migState.error) {
  warn("cannot tell — one of them did not connect (see below)");
} else if (appState.fingerprint === migState.fingerprint) {
  same = true;
  ok("yes — both connections reach the same database");
  if (app.host !== mig.host) {
    console.log(`    ${D}(different hostnames, one database — normal on Supabase: the pooled${O}`);
    console.log(`    ${D}endpoint and the direct one are two doors into the same place)${O}`);
  }
} else {
  same = false;
  bad("NO — these are genuinely two different databases");
  console.log(`    DATABASE_URL -> ${app.host}:${app.port}/${app.database}`);
  console.log(`    DIRECT_URL   -> ${mig.host}:${mig.port}/${mig.database}`);
  warn("a migration applied through DIRECT_URL will never appear to the app");
}
if (app.schema !== mig.schema) {
  bad(`schema mismatch: app reads "${app.schema}", migrations write "${mig.schema}"`);
}

let viaApp = report(`Through DATABASE_URL — what the deployed site actually sees`, appState, app.schema);
if (same !== true) report(`Through DIRECT_URL — where migrations land`, migState, mig.schema);

// ------------------------------------------------------------------- repair
if (!viaApp && FIX) {
  head("Repairing");
  const run = (args) => {
    console.log(`  ${D}$ npx prisma ${args.join(" ")}${O}`);
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
    console.log(`  ${D}database has tables but no history — baselining first${O}`);
    run(["migrate", "resolve", "--applied", BASELINE]);
  } else if (!hasTables) {
    console.log(`  ${D}database is empty — applying every migration${O}`);
  } else {
    console.log(`  ${D}history already present — applying what is pending${O}`);
  }
  run(["migrate", "deploy"]);

  head("Re-checking THROUGH DATABASE_URL (the one the site uses)");
  viaApp = report("Result", await inspect(appUrl, app.schema), app.schema);
}

// ------------------------------------------------------------------- verdict
head("Verdict");
if (viaApp && isLocal) {
  console.log(`  ${Y}${B}The LOCAL database at ${app.host} has public.StoredFile.${O}`);
  console.log(`  ${Y}This tells you nothing about production.${O} Re-run with your production`);
  console.log(`  connection strings before deciding whether to redeploy.`);
  process.exit(0);
}
if (viaApp) {
  console.log(`  ${G}${B}The database the app reads has public.StoredFile.${O}`);
  console.log(`  ${D}(host ${app.host} — check this is the host Vercel uses.)${O}`);
  console.log(`  You can redeploy on Vercel.`);
  console.log(`  ${D}If the runtime log still shows the old error afterwards, check its timestamp —${O}`);
  console.log(`  ${D}Vercel keeps previous logs, and an old line is not a new failure.${O}`);
  process.exit(0);
}
console.log(`  ${R}${B}The database the app reads does NOT have public.StoredFile.${O}`);
if (same === false) {
  console.log(`  The two URLs reach different databases. Fix that first: DATABASE_URL and`);
  console.log(`  DIRECT_URL must be two endpoints of the SAME database — on Supabase, the`);
  console.log(`  pooled string (port 6543) and the direct one (port 5432) of one project.`);
} else if (!FIX) {
  console.log(`  Run:  ${B}npm run db:doctor -- --fix${O}`);
  console.log(`  It baselines only if needed, applies the missing migration, and re-checks.`);
  console.log(`  It never drops or resets anything.`);
} else {
  console.log(`  The repair ran and the table is still missing. Read the errors above.`);
}
console.log(`\n  ${D}Also confirm these same two values are set in Vercel -> Settings ->${O}`);
console.log(`  ${D}Environment Variables for Production, and redeploy after changing them.${O}`);
process.exit(1);
