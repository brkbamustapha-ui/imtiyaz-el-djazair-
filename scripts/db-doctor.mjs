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

/**
 * Printed by every run, including --summary.
 *
 * Two people comparing two outputs need to know they ran the same code. Without
 * this, an old copy of the script and a current one produce contradictory
 * numbers that look like a database problem and are really a stale file — which
 * is exactly how "the SQL Editor says 22, the doctor says 4" survives a fix.
 */
const VERSION = "v3 — 2026-08-28, detection by to_regclass";

// --from-file reads the file `vercel env pull` writes, so production can be
// checked without those values ever being typed out or stored in .env.
//
// It is NOT called --env-file: node has a flag by that name and swallows it,
// failing with a bare "node: <file>: not found" before this script ever runs.
// The old spelling is still accepted — if it reaches us the file exists — but
// --from-file is the one that behaves the same whether the file is there or not.
/**
 * Every table the schema expects.
 *
 * This used to ask about StoredFile alone, which is exactly how a database
 * missing SiteSetting passed inspection: the one table it checked happened to
 * be there. A report that answers "is the database complete?" has to compare
 * the whole list, not the table that broke last time.
 */
function expectedTables() {
  try {
    const schema = fs.readFileSync(path.join(process.cwd(), "prisma", "schema.prisma"), "utf8");
    const models = [...schema.matchAll(/^model\s+(\w+)\s*\{/gm)].map((m) => m[1]);
    // A model renamed with @@map is stored under the mapped name, so the model
    // name would be the wrong thing to look for. There is none in this schema;
    // say so out loud rather than reporting phantom missing tables if one is
    // ever added.
    if (/^\s*@@map\s*\(/m.test(schema)) {
      warn("schema.prisma uses @@map — table names may differ from model names");
    }
    return models;
  } catch {
    return [];
  }
}

/**
 * The tables a migration's SQL creates, read from the migration itself.
 *
 * Used to decide whether baselining is honest. `migrate resolve --applied`
 * records a migration WITHOUT running it, so it is only ever correct when the
 * database already contains everything that migration would have created.
 * Recording it over a database that has some of those tables is how a schema
 * ends up permanently missing the rest, with Prisma convinced it is up to date
 * — that is what produced "public.SiteSetting does not exist" in production.
 */
function tablesCreatedBy(migration) {
  try {
    const sql = fs.readFileSync(
      path.join(process.cwd(), "prisma", "migrations", migration, "migration.sql"), "utf8",
    );
    return [...sql.matchAll(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+"([^"]+)"/gi)].map((m) => m[1]);
  } catch {
    return [];
  }
}

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

/**
 * --sql prints the read-only query this script runs, generated from the same
 * model list, ready to paste into the provider's SQL editor.
 *
 * It exists because "the SQL Editor says 22, this says 4" is only answerable by
 * asking the server the SAME question from both places. It needs no connection
 * and no credentials, so it works even when the connection string cannot be
 * read back.
 */
if (process.argv.includes("--sql")) {
  const names = expectedTables();
  if (!names.length) {
    console.log("Could not read prisma/schema.prisma — run this from the project root.");
    process.exit(1);
  }
  const values = names.map((n) => `  ('${n}')`).join(",\n");
  console.log(`-- Read only. Paste into Supabase -> SQL Editor -> New query -> Run.
-- Generated from prisma/schema.prisma (${names.length} models) by db-doctor ${VERSION}.
WITH expected(name) AS (VALUES
${values}
)
SELECT
  count(*) FILTER (WHERE to_regclass('public.' || quote_ident(name)) IS NOT NULL) AS present,
  count(*)                                                                       AS expected,
  coalesce(string_agg(name, ', ') FILTER (
    WHERE to_regclass('public.' || quote_ident(name)) IS NULL), '(none)')         AS missing,
  current_database()                                                             AS database,
  (SELECT oid FROM pg_database WHERE datname = current_database())               AS database_oid
FROM expected;`);
  process.exit(0);
}

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
    // The database's own oid, printed in the report. It is not a secret and it
    // is the one value that settles "is the SQL Editor looking at the database
    // this script just read?" — the operator runs
    //   SELECT oid, current_database() FROM pg_database WHERE datname = current_database();
    // there and compares. Two different numbers end the argument in one line.
    const [{ oid: databaseOid }] = await db.$queryRawUnsafe(
      `SELECT (SELECT oid FROM pg_database WHERE datname = current_database())::text AS oid`,
    );
    try {
      const [r] = await db.$queryRawUnsafe("SELECT system_identifier::text AS id FROM pg_control_system()");
      fingerprint = `sys:${r.id}/${current_database}`;
    } catch {
      const [r] = await db.$queryRawUnsafe(`SELECT pg_postmaster_start_time()::text AS started`);
      fingerprint = `oid:${databaseOid}/${r.started}/${current_database}`;
    }
    // Every table in the schema, for the count.
    const tables = await db.$queryRawUnsafe(
      `SELECT c.relname::text AS t
         FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = $1 AND c.relkind IN ('r', 'p')
        ORDER BY 1`, schema,
    );

    // ------------------------------------------------------------------
    // One query, three independent answers to "is this table here?", plus
    // where else a table of that name lives.
    //
    // They are asked together on purpose. A single number is a claim; three
    // numbers are evidence, and the SHAPE of a disagreement names its cause:
    //
    //   info < pg_class = regclass   the tables exist and this role holds no
    //                                privilege on them. information_schema is
    //                                privilege-filtered by the SQL standard —
    //                                it lists what you may touch, not what is
    //                                there. This is a grants finding, not a
    //                                missing-table finding.
    //   all three low, `elsewhere`   the table is real but under a different
    //                                case ("user" vs "User") or in a different
    //                                schema. Both are addressable, not absent.
    //   all three low, nothing else  it was never created in this database.
    //
    // Measured on four purpose-built databases (all-correct; 18 owned by
    // another role; 18 folded to lower case; 18 in another schema), read as the
    // low-privilege role: to_regclass and pg_class agreed in every one of them,
    // 22/22/22 and 4/4/4 and — in the privilege case — 4 / 22 / 22.
    //
    // to_regclass leads because it is the method of
    // prisma/migrations/CHECK_IN_SUPABASE_all_tables.sql. Two tools that ask
    // the server the same question cannot come back with two different answers,
    // and that is the whole point: this script and the Supabase SQL Editor now
    // agree by construction, or the run says why not.
    // ------------------------------------------------------------------
    const expected = expectedTables();
    const checks = expected.length
      ? await db.$queryRawUnsafe(
          `WITH expected(name) AS (SELECT unnest($2::text[]))
           SELECT e.name::text AS name,
                  (to_regclass(quote_ident($1) || '.' || quote_ident(e.name)) IS NOT NULL)
                    AS by_regclass,
                  EXISTS (SELECT 1 FROM pg_class c
                            JOIN pg_namespace n ON n.oid = c.relnamespace
                           WHERE n.nspname = $1 AND c.relname = e.name
                             AND c.relkind IN ('r', 'p')) AS by_pgclass,
                  EXISTS (SELECT 1 FROM information_schema.tables t
                           WHERE t.table_schema = $1 AND t.table_name = e.name)
                    AS by_infoschema,
                  COALESCE((SELECT string_agg(DISTINCT n.nspname || '.' || c.relname, ', ')
                              FROM pg_class c
                              JOIN pg_namespace n ON n.oid = c.relnamespace
                             WHERE lower(c.relname) = lower(e.name)
                               AND c.relkind IN ('r', 'p')
                               AND n.nspname NOT IN ('pg_catalog', 'information_schema')
                               AND n.nspname NOT LIKE 'pg\\_%'
                               AND NOT (n.nspname = $1 AND c.relname = e.name)), '')
                    AS elsewhere
           FROM expected e ORDER BY e.name`, schema, expected,
        )
      : [];
    let migrations = null;
    let migrationsUnreadable = false;
    try {
      migrations = await db.$queryRawUnsafe(
        `SELECT migration_name::text AS name, (finished_at IS NOT NULL) AS done, (rolled_back_at IS NOT NULL) AS rolled_back
         FROM "${schema}"._prisma_migrations ORDER BY started_at`,
      );
    } catch (error) {
      // "absent" and "there but not readable by this role" are different facts.
      // Reporting the second as the first is how a privilege problem gets
      // mistaken for a missing migration.
      const exists = await db
        .$queryRawUnsafe(
          `SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = $1 AND c.relname = '_prisma_migrations'`, schema,
        )
        .catch(() => []);
      migrationsUnreadable = Array.isArray(exists) && exists.length > 0;
      void error;
    }
    const count = (key) => checks.filter((c) => c[key]).length;
    return {
      fingerprint,
      databaseOid,
      currentDatabase: current_database,
      currentSchema: current_schema,
      tables: tables.map((r) => r.t),
      checks,
      // to_regclass is the verdict. The other two are shown beside it as
      // evidence, never used to declare a table missing.
      present: checks.filter((c) => c.by_regclass).map((c) => c.name),
      missing: checks.filter((c) => !c.by_regclass).map((c) => c.name),
      counts: {
        expected: checks.length,
        regclass: count("by_regclass"),
        pgclass: count("by_pgclass"),
        infoschema: count("by_infoschema"),
      },
      migrations,
      migrationsUnreadable,
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
  ok(`connected to database "${state.currentDatabase}" (oid ${state.databaseOid})`);
  say(`    ${D}compare that oid in the SQL Editor with:${O}`);
  say(`    ${D}  SELECT oid, datname FROM pg_database WHERE datname = current_database();${O}`);
  say(`    tables in schema "${schema}": ${state.tables.length}`);

  // The three methods, side by side, every run. When they agree the line is
  // reassurance; when they do not it is the diagnosis.
  const c = state.counts;
  const agree = c.regclass === c.pgclass && c.pgclass === c.infoschema;
  say(
    `    detection: to_regclass ${c.regclass}/${c.expected}` +
    ` · pg_class ${c.pgclass}/${c.expected}` +
    ` · information_schema ${c.infoschema}/${c.expected}`,
  );
  if (!agree && c.infoschema < c.regclass) {
    warn(`information_schema sees fewer tables than exist — that is a PRIVILEGE`);
    say(`      difference, not a missing table. It lists only what this role holds a`);
    say(`      grant on. The tables are there; to_regclass and pg_class both say so.`);
    say(`      ${D}An older build of this script trusted information_schema and reported${O}`);
    say(`      ${D}exactly this as "${c.expected - c.infoschema} tables missing".${O}`);
  } else if (!agree) {
    warn(`the three methods disagree in an unexpected way — report the line above`);
  }

  // The whole picture: anything the schema declares and the database lacks.
  const missing = state.missing;
  if (c.expected && missing.length === 0) {
    ok(`all ${c.expected} tables the schema expects are present`);
  } else if (missing.length) {
    bad(`${missing.length} of ${c.expected} tables are MISSING: ${missing.join(", ")}`);
    // "Missing" and "not where you are looking" are different repairs. Say which.
    const misplaced = state.checks.filter((x) => !x.by_regclass && x.elsewhere);
    if (misplaced.length) {
      warn(`${misplaced.length} of them exist under a different name or schema:`);
      for (const x of misplaced.slice(0, 5)) say(`      ${x.name}  ->  ${x.elsewhere}`);
      if (misplaced.length > 5) say(`      ${D}… and ${misplaced.length - 5} more${O}`);
      say(`      ${D}PostgreSQL folds an unquoted identifier to lower case, so${O}`);
      say(`      ${D}CREATE TABLE User creates "user", which is a different table.${O}`);
    }
    if (misplaced.length < missing.length) {
      warn(`a recorded migration whose SQL never ran leaves exactly this state`);
    }
  }

  const storedFile = state.checks.find((x) => x.name === "StoredFile");
  const here = Boolean(storedFile?.by_regclass);
  if (here) ok(`${schema}.StoredFile EXISTS`);
  else if (storedFile?.elsewhere) {
    bad(`StoredFile is NOT in "${schema}" — it is at: ${storedFile.elsewhere}`);
    warn(`the app looks in "${schema}", so it cannot see it`);
  } else bad(`StoredFile does not exist in this database, in any schema`);
  void here;

  if (!state.migrations && state.migrationsUnreadable) {
    warn(`_prisma_migrations exists but this role cannot read it — history unknown`);
  } else if (!state.migrations) {
    warn(`_prisma_migrations is absent — this database has no migration history`);
  }
  else {
    say(`    migration history (${state.migrations.length}):`);
    for (const m of state.migrations) {
      const mark = m.rolled_back ? `${R}rolled back${O}` : m.done ? `${G}applied${O}` : `${Y}started, not finished${O}`;
      say(`      ${m.name}  ${mark}`);
    }
  }
  // Complete, not "the one table that broke last time is there". A database
  // holding StoredFile and missing SiteSetting used to pass this check.
  return c.expected > 0 && missing.length === 0;
}

// ------------------------------------------------------------------- run
say(`${B}Database doctor${O} ${D}${VERSION} — credentials are never printed${O}`);

let appUrl = process.env.DATABASE_URL;
const migUrl = process.env.DIRECT_URL;
let app = describe(appUrl);
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

// A file written by `vercel env pull` often has no DATABASE_URL at all: a
// variable marked Sensitive is write-only and comes back without its value.
// DIRECT_URL reaches the same database, so inspect through that rather than
// refusing — the question is what the database contains, not which door was used.
let usingDirectAsFallback = false;
if ((!app || app.invalid) && mig && !mig.invalid) {
  usingDirectAsFallback = true;
  appUrl = migUrl;
  app = mig;
  warn("DATABASE_URL is not in this file — inspecting through DIRECT_URL instead");
  warn("(Vercel returns no value for a variable marked Sensitive; same database)");
}

if (!app || app.invalid) {
  // Always printed, even under --summary: a run that dies silently with exit 1
  // tells the reader nothing at all.
  console.log(`\n${R}${B}Neither DATABASE_URL nor DIRECT_URL is set to a valid connection string.${O}`);
  console.log(`Put at least one of them in the file you passed to --from-file.`);
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

let appReachable = !appState.error && Boolean(appState.tables);
// The summary must describe the state the run ENDS in. --fix re-inspects below
// and replaces these; otherwise a successful repair still reports the broken
// state it started from.
let finalState = appState;
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
        .toString().split("\n").filter(Boolean).slice(-3).forEach((l) => say(`    ${l}`));
      return true;
    } catch (e) {
      const out = `${e.stdout ?? ""}${e.stderr ?? ""}`.split("\n").filter(Boolean).slice(-4);
      out.forEach((l) => say(`    ${R}${l}${O}`));
      return false;
    }
  };
  // Baselining only matters on a database that already has the tables. On an
  // empty one it would claim a migration ran that never did, so skip it there.
  // (This is the mistake that produced "SiteSetting does not exist" in
  // production: a migration recorded as applied whose SQL was never run.)
  const state = await inspect(migUrl, mig.schema);
  const hasTables = state && !state.error && state.tables.length > 0;
  const hasHistory = state && !state.error && state.migrations !== null;

  // "Has some tables" is not "has the tables this migration creates". A
  // half-populated database passed the old test and got baselined, which
  // recorded 21 tables as created when only a few were — and left the rest
  // permanently missing, because migrate deploy then had nothing to apply.
  const baselineTables = tablesCreatedBy(BASELINE);
  const absent = baselineTables.filter((t) => !state?.tables?.includes(t));
  const baselineIsHonest = baselineTables.length > 0 && absent.length === 0;

  if (hasTables && !hasHistory && baselineIsHonest) {
    say(`  ${D}database already has all ${baselineTables.length} tables of ${BASELINE}${O}`);
    say(`  ${D}but no history — recording it as applied, then applying the rest${O}`);
    run(["migrate", "resolve", "--applied", BASELINE]);
  } else if (hasTables && !hasHistory) {
    // Refuse. Baselining here would hide exactly the tables that are missing.
    bad(`refusing to baseline: ${absent.length} of the ${baselineTables.length} tables`);
    say(`    in ${BASELINE} are not in this database:`);
    say(`      ${absent.slice(0, 8).join(", ")}${absent.length > 8 ? `, … (+${absent.length - 8})` : ""}`);
    say(`    Recording it as applied would tell Prisma those tables exist, and`);
    say(`    nothing would ever create them. Create them first, without touching`);
    say(`    any existing row, by running this in your provider's SQL editor:`);
    say(`      ${B}prisma/migrations/RUN_IN_SUPABASE_create_missing_tables.sql${O}`);
    say(`    Every statement in it is guarded, so it skips whatever is already there.`);
    say(`    Then run this command again.`);
    printSummary(finalState, appReachable);
    removeEnvFile();
    process.exit(1);
  } else if (!hasTables) {
    say(`  ${D}database is empty — applying every migration${O}`);
  } else {
    say(`  ${D}history already present — applying what is pending${O}`);
  }
  run(["migrate", "deploy"]);

  head("Re-checking THROUGH DATABASE_URL (the one the site uses)");
  finalState = await inspect(appUrl, app.schema);
  appReachable = !finalState.error && Boolean(finalState.tables);
  viaApp = report("Result", finalState, app.schema);
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

  const expected = expectedTables();
  const missing = reachable ? state.missing : [];

  const storedFile = reachable ? state.checks.find((x) => x.name === "StoredFile") : null;
  let l3;
  if (!reachable) l3 = "indéterminé — connexion impossible";
  else l3 = storedFile?.by_regclass
    ? "existe"
    : storedFile?.elsewhere
      ? `n'existe pas dans "${app.schema}" (trouvée à : ${storedFile.elsewhere})`
      : "n'existe pas";

  let l4;
  if (!reachable) l4 = "indéterminé — connexion impossible";
  else if (!state.migrations && state.migrationsUnreadable) l4 = "illisible par ce rôle (table présente)";
  else if (!state.migrations) l4 = "aucun historique (_prisma_migrations absente)";
  else if (state.migrations.length === 0) l4 = "historique présent mais vide";
  else {
    const done = state.migrations.filter((m) => m.done && !m.rolled_back);
    const pending = state.migrations.filter((m) => !m.done || m.rolled_back);
    l4 = pending.length === 0
      ? `${done.length}/${state.migrations.length} appliquées — ${done.map((m) => m.name).join(", ")}`
      : `${done.length}/${state.migrations.length} appliquées, en attente : ${pending.map((m) => m.name).join(", ")}`;
  }

  // First line, always. Anyone comparing two contradictory outputs needs to
  // know whether they came from the same script.
  console.log(`db-doctor : ${VERSION}`);
  console.log(`DATABASE_URL Production : ${usingDirectAsFallback ? "absente du fichier (contrôle fait via DIRECT_URL)" : l1}`);
  console.log(`Base Production : ${l2}${reachable ? ` — base "${state.currentDatabase}" oid ${state.databaseOid}` : ""}`);
  console.log(`public.StoredFile : ${l3}`);
  console.log(`Migrations : ${l4}`);
  console.log(
    `Tables manquantes : ${
      !reachable ? "indéterminé — connexion impossible"
      : missing.length === 0 ? `aucune (${expected.length}/${expected.length})`
      : `${missing.length} — ${missing.join(", ")}`
    }`,
  );
  // Only when the methods disagree. On a healthy database this prints nothing,
  // so the five lines above stay the five lines the operator expects.
  if (reachable) {
    const c = state.counts;
    if (c.infoschema < c.regclass) {
      console.log(
        `Note : information_schema n'en voit que ${c.infoschema}/${c.expected} — ` +
        `privilèges du rôle, pas des tables absentes (to_regclass ${c.regclass}, pg_class ${c.pgclass}).`,
      );
    } else if (c.regclass !== c.pgclass) {
      console.log(`Note : to_regclass ${c.regclass}, pg_class ${c.pgclass}, information_schema ${c.infoschema} — désaccord inattendu.`);
    }
    // One line, not one per table: eighteen identical notes bury the finding.
    const misplaced = state.checks.filter((y) => !y.by_regclass && y.elsewhere);
    if (misplaced.length) {
      const sample = misplaced.slice(0, 3).map((x) => `${x.name} → ${x.elsewhere}`).join(" ; ");
      console.log(
        `Note : ${misplaced.length} table(s) existent sous un autre nom ou dans un autre ` +
        `schéma — ${sample}${misplaced.length > 3 ? " ; …" : ""}`,
      );
    }
  }
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
  say(`  ${Y}${B}The LOCAL database at ${app.host} is complete.${O}`);
  say(`  ${Y}This tells you nothing about production.${O} Re-run with your production`);
  say(`  connection strings before deciding whether to redeploy.`);
  printSummary(finalState, appReachable);
  removeEnvFile();
  process.exit(0);
}
if (viaApp) {
  say(`  ${G}${B}The database the app reads has every table the schema expects.${O}`);
  say(`  ${D}(host ${app.host} — check this is the host Vercel uses.)${O}`);
  say(`  You can redeploy on Vercel.`);
  say(`  ${D}If the runtime log still shows the old error afterwards, check its timestamp —${O}`);
  say(`  ${D}Vercel keeps previous logs, and an old line is not a new failure.${O}`);
  printSummary(finalState, appReachable);
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
  printSummary(finalState, appReachable);
  removeEnvFile();
  process.exit(1);
}
say(`  ${R}${B}The database the app reads is MISSING tables the schema expects.${O}`);
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
printSummary(finalState, appReachable);
removeEnvFile();
process.exit(1);
