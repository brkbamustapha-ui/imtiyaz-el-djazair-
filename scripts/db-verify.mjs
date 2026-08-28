#!/usr/bin/env node
/**
 * Which database does each connection string in this file actually reach, and
 * does it hold the 22 tables the schema declares?
 *
 *   npm run db:verify -- --from-file .env.production
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS, AND WHY IT IS NOT PART OF db:doctor
 *
 * `npm run db:doctor` has existed since before the detection bug was fixed. Run
 * it in a checkout that never received the fix and it runs the old code and
 * prints an old answer, with nothing in the output to say so. Two people then
 * compare two numbers that came from two different programs and conclude the
 * database is broken.
 *
 * `db:verify` is a script name that did not exist before. In a stale checkout
 * npm answers "Missing script: db:verify" and stops. That failure is the point:
 * it is impossible to run this command and silently get an old answer.
 *
 * It also does the thing db:doctor does not: it opens EVERY PostgreSQL URL in
 * the file — DATABASE_URL, DIRECT_URL and every POSTGRES_* the Vercel/Supabase
 * integration writes — and asks each server which database it is. Variables
 * that disagree are the single most common reason a schema looks complete in
 * the provider's SQL editor and incomplete from a laptop, and no amount of
 * re-reading one connection string can reveal it.
 * ---------------------------------------------------------------------------
 *
 * Read only. It issues SELECTs and nothing else: no CREATE, no ALTER, no DROP,
 * no TRUNCATE, no DELETE, no UPDATE, no migration, no `db push`.
 *
 * Passwords are never printed, never logged, never written anywhere.
 */
import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const B = "\x1b[1m", R = "\x1b[31m", G = "\x1b[32m", Y = "\x1b[33m", D = "\x1b[2m", O = "\x1b[0m";
const ok = (m) => console.log(`  ${G}✓${O} ${m}`);
const bad = (m) => console.log(`  ${R}✗${O} ${m}`);
const warn = (m) => console.log(`  ${Y}!${O} ${m}`);
const head = (m) => console.log(`\n${B}${m}${O}`);

const SELF = fileURLToPath(import.meta.url);

function flagValue(...names) {
  for (const name of names) {
    const i = process.argv.indexOf(name);
    if (i !== -1) return process.argv[i + 1] ?? null;
  }
  return null;
}
const ENV_FILE = flagValue("--from-file", "--env-file");

/**
 * The variables Prisma reads, in the order it reads them.
 *
 * This is not a preference list — it is what prisma/schema.prisma says:
 *   url       = env("DATABASE_URL")
 *   directUrl = env("DIRECT_URL")
 * The deployed application queries through DATABASE_URL and nothing else. The
 * POSTGRES_* variables an integration writes are read by no part of this
 * project; they are inspected here only because they are evidence about which
 * database the account is really pointed at.
 */
const APP_VARIABLE = "DATABASE_URL";
const MIGRATION_VARIABLE = "DIRECT_URL";

/** Parse KEY=value lines. Values are kept in memory only. */
function readEnvFile(file) {
  const out = new Map();
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    out.set(t.slice(0, i).trim(), t.slice(i + 1).trim().replace(/^["']|["']$/g, ""));
  }
  return out;
}

/**
 * Hide the middle of a Supabase project reference.
 *
 * The reference is not a credential — it is visible in every API URL of the
 * project — but it is not printed in full either. Masking it the same way
 * everywhere keeps the only property that matters here: two variables pointing
 * at the same project render identically, two pointing at different projects
 * do not.
 */
const mask = (s) => (s.length <= 10 ? s : `${s.slice(0, 4)}…${s.slice(-4)}`);
const maskHost = (h) => h.replace(/^db\.([a-z0-9]{8,})\./i, (_, ref) => `db.${mask(ref)}.`);
const maskUser = (u) => u.replace(/^([^.]+)\.([a-z0-9]{8,})$/i, (_, base, ref) => `${base}.${mask(ref)}`);

function describe(raw) {
  let u;
  try { u = new URL(raw); } catch { return null; }
  if (!/^postgres(ql)?:$/.test(u.protocol)) return null;
  return {
    host: u.hostname,
    port: u.port || "5432",
    database: u.pathname.replace(/^\//, "") || "(default)",
    schema: u.searchParams.get("schema") || "public",
    user: u.username || "(none)",
    hasPassword: u.password !== "",
  };
}

function expectedTables() {
  const file = path.join(process.cwd(), "prisma", "schema.prisma");
  const schema = fs.readFileSync(file, "utf8");
  return [...schema.matchAll(/^model\s+(\w+)\s*\{/gm)].map((m) => m[1]);
}

/**
 * Ask one server who it is and what it holds.
 *
 * Detection is to_regclass, the same function
 * prisma/migrations/CHECK_IN_SUPABASE_all_tables.sql uses, so this script and
 * the provider's SQL editor cannot return different answers about one database.
 * pg_class and information_schema are read alongside it as evidence:
 * information_schema is privilege-filtered by the SQL standard and reports only
 * what the connecting role holds a grant on, which reads as missing tables when
 * it is really missing permissions.
 */
async function probe(url, schema, expected) {
  const db = new PrismaClient({ datasources: { db: { url } }, log: [] });
  try {
    const [id] = await db.$queryRawUnsafe(
      `SELECT current_database()::text AS database,
              (SELECT oid FROM pg_database WHERE datname = current_database())::text AS oid,
              current_user::text AS role,
              current_schema()::text AS current_schema`,
    );
    const rows = await db.$queryRawUnsafe(
      `WITH expected(name) AS (SELECT unnest($2::text[]))
       SELECT e.name::text AS name,
              (to_regclass(quote_ident($1) || '.' || quote_ident(e.name)) IS NOT NULL) AS by_regclass,
              EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                       WHERE n.nspname = $1 AND c.relname = e.name
                         AND c.relkind IN ('r', 'p')) AS by_pgclass,
              EXISTS (SELECT 1 FROM information_schema.tables t
                       WHERE t.table_schema = $1 AND t.table_name = e.name) AS by_infoschema
       FROM expected e ORDER BY e.name`, schema, expected,
    );
    return {
      ...id,
      missing: rows.filter((r) => !r.by_regclass).map((r) => r.name),
      regclass: rows.filter((r) => r.by_regclass).length,
      pgclass: rows.filter((r) => r.by_pgclass).length,
      infoschema: rows.filter((r) => r.by_infoschema).length,
    };
  } catch (error) {
    // Prisma messages open with a blank line and a generic preamble; the reason
    // is further down and is the only part worth showing.
    const lines = String(error?.message ?? error).split("\n").map((l) => l.trim()).filter(Boolean);
    const message = lines.find((l) => !/^Invalid `prisma|^invocation:?$/i.test(l)) ?? "unknown error";
    // Belt and braces. Driver messages quote the host, not the credentials, but
    // this text is printed and a password must not reach a terminal, a
    // screenshot or a support thread because some future error phrased itself
    // differently.
    const scrubbed = message.replace(/postgres(ql)?:\/\/[^\s"']*/gi, "postgresql://********");
    return { error: scrubbed.slice(0, 160) };
  } finally {
    await db.$disconnect().catch(() => undefined);
  }
}

// --------------------------------------------------------------------- run
console.log(`${B}db-verify${O} ${D}— read only; passwords are never printed${O}`);
console.log(`  ${D}script   ${SELF}${O}`);
console.log(`  ${D}checksum ${crypto.createHash("sha256").update(fs.readFileSync(SELF)).digest("hex").slice(0, 16)}${O}`);

if (!ENV_FILE) {
  console.log(`\n${R}Give it a file:${O}  npm run db:verify -- --from-file .env.production`);
  process.exit(1);
}
const resolved = path.resolve(process.cwd(), ENV_FILE);
if (!fs.existsSync(resolved)) {
  console.log(`\n${R}No such file: ${ENV_FILE}${O}`);
  console.log(`Run it from the project folder, or create the file with:`);
  console.log(`  vercel env pull ${ENV_FILE} --environment=production`);
  process.exit(1);
}

let expected;
try {
  expected = expectedTables();
} catch {
  console.log(`\n${R}Cannot read prisma/schema.prisma from ${process.cwd()}${O}`);
  console.log(`Run this from the project folder — the one holding package.json.`);
  process.exit(1);
}
console.log(`  ${D}schema   prisma/schema.prisma — ${expected.length} models${O}`);

const values = readEnvFile(resolved);
const candidates = [...values.entries()]
  .map(([key, value]) => [key, value, describe(value)])
  .filter(([, , d]) => d !== null);

head(`Connection strings in ${ENV_FILE}`);
console.log(`  ${D}${values.size} variables in the file; ${candidates.length} are PostgreSQL URLs${O}`);
if (candidates.length === 0) {
  bad(`none of them is a PostgreSQL connection string`);
  console.log(`    Variables present: ${[...values.keys()].join(", ") || "(none)"}`);
  console.log(`    A value marked Sensitive in Vercel comes back empty — that is why`);
  console.log(`    ${APP_VARIABLE} can be listed there and missing here.`);
  process.exit(1);
}

const results = new Map();
for (const [key, value, d] of candidates) {
  const result = await probe(value, d.schema, expected);
  results.set(key, { d, result });
}

for (const [key, { d, result }] of results) {
  const role = key === APP_VARIABLE ? "  ← the app queries through this"
    : key === MIGRATION_VARIABLE ? "  ← migrations run through this"
      : "  (not read by this project)";
  console.log(`\n  ${B}${key}${O}${D}${role}${O}`);
  console.log(`    host      ${maskHost(d.host)}:${d.port}`);
  console.log(`    user      ${maskUser(d.user)}   password ${d.hasPassword ? "******** (set)" : `${R}not set${O}`}`);
  console.log(`    schema    ${d.schema}`);
  if (result.error) {
    bad(`  cannot connect — ${result.error}`);
    continue;
  }
  console.log(`    server says: database "${result.database}" oid ${B}${result.oid}${O}, role ${result.role}`);
  const line = `    tables: to_regclass ${result.regclass}/${expected.length}` +
    ` · pg_class ${result.pgclass}/${expected.length}` +
    ` · information_schema ${result.infoschema}/${expected.length}`;
  console.log(line);
  if (result.missing.length === 0) ok(`  complete`);
  else bad(`  ${result.missing.length} missing: ${result.missing.slice(0, 6).join(", ")}${result.missing.length > 6 ? ` … (+${result.missing.length - 6})` : ""}`);
  if (result.infoschema < result.regclass) {
    warn(`  information_schema is privilege-filtered — that gap is grants, not tables`);
  }
}

// ------------------------------------------------- do they address one database?
head("Do these variables address the same database?");
const reachable = [...results.entries()].filter(([, v]) => !v.result.error);
const byOid = new Map();
for (const [key, v] of reachable) {
  const id = `${v.result.database}#${v.result.oid}`;
  byOid.set(id, [...(byOid.get(id) ?? []), key]);
}
if (byOid.size === 0) {
  bad("none of them connected — nothing can be compared");
} else if (byOid.size === 1) {
  ok(`yes — all ${reachable.length} reach ${[...byOid.keys()][0]}`);
  console.log(`    ${D}Different hostnames for one database are normal on Supabase: the${O}`);
  console.log(`    ${D}pooled endpoint and the direct one are two doors into one place.${O}`);
} else {
  bad(`NO — these variables point at ${byOid.size} different databases:`);
  for (const [id, keys] of byOid) console.log(`      ${id}  ←  ${keys.join(", ")}`);
  console.log(`    ${D}Compare an oid with what your SQL editor prints for the project you${O}`);
  console.log(`    ${D}have been looking at:${O}`);
  console.log(`      ${D}SELECT oid, datname FROM pg_database WHERE datname = current_database();${O}`);
  console.log(`    The variable whose oid does NOT match that one is the wrong value.`);
}

// ---------------------------------------------------------------- verdict
head("Verdict");
const appEntry = results.get(APP_VARIABLE) ?? results.get(MIGRATION_VARIABLE);
const appKey = results.has(APP_VARIABLE) ? APP_VARIABLE
  : results.has(MIGRATION_VARIABLE) ? MIGRATION_VARIABLE : null;

if (!appEntry) {
  bad(`Neither ${APP_VARIABLE} nor ${MIGRATION_VARIABLE} is in this file.`);
  console.log(`  The POSTGRES_* variables above are written by an integration and are`);
  console.log(`  read by NO part of this project — prisma/schema.prisma names`);
  console.log(`  ${APP_VARIABLE} and ${MIGRATION_VARIABLE}. Whatever those POSTGRES_* values`);
  console.log(`  reach, the deployed site does not use them.`);
  console.log(`\nTables manquantes : indéterminé — ${APP_VARIABLE} absente du fichier`);
  process.exit(1);
}
if (appEntry.result.error) {
  bad(`${appKey} did not connect: ${appEntry.result.error}`);
  console.log(`\nTables manquantes : indéterminé — connexion impossible`);
  process.exit(1);
}
if (appKey !== APP_VARIABLE) {
  warn(`${APP_VARIABLE} is not in this file — reporting on ${appKey} instead.`);
  warn(`A Vercel variable marked Sensitive comes back without its value.`);
}
const { result } = appEntry;
console.log(`  ${appKey} reaches database "${result.database}" oid ${B}${result.oid}${O}`);
console.log(
  `\nTables manquantes : ${
    result.missing.length === 0
      ? `aucune (${expected.length}/${expected.length})`
      : `${result.missing.length} — ${result.missing.join(", ")}`
  }`,
);
process.exit(result.missing.length === 0 ? 0 : 1);
