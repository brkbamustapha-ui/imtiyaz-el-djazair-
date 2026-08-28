import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; dbLogged?: boolean };

/**
 * Name the database this process will talk to, once, at startup.
 *
 * "Is the deployed runtime using the DATABASE_URL I think it is?" cannot be
 * answered from a laptop — only the running process knows what was injected
 * into its environment. One line in the platform log settles it.
 *
 * Host, database and schema only: never the user, the password or the string
 * itself. Those are what the connection is; these are only where it points.
 */
function logTarget() {
  if (globalForPrisma.dbLogged) return;
  globalForPrisma.dbLogged = true;
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    console.error("[db] DATABASE_URL is not set in this environment");
    return;
  }
  try {
    const url = new URL(raw);
    const database = url.pathname.replace(/^\//, "") || "(default)";
    const schema = url.searchParams.get("schema") ?? "public";
    console.log(`[db] connecting to ${url.hostname}:${url.port || "5432"}/${database} schema=${schema}`);
  } catch {
    console.error("[db] DATABASE_URL is set but is not a valid connection string");
  }
}

logTarget();

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
