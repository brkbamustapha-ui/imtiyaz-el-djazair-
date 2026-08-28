import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "./db";

/** Where the generated fallback key lives when AUTH_SECRET is not configured. */
const SECRET_SETTING_KEY = "authSecret";

/** Resolved once per warm instance; the value never changes while it runs. */
let cachedSecret: string | null = null;

/**
 * The key that signs session and CSRF tokens.
 *
 * AUTH_SECRET is still the right place to put it, and it is preferred whenever
 * it is set. But a missing env var used to THROW in production, which took the
 * whole admin down: /admin/login raised "AUTH_SECRET is missing or too short"
 * before it could render, so nobody could sign in at all. A deployment that
 * cannot be administered is a worse outcome than the tradeoff below.
 *
 * So when the variable is absent the app generates a 64-byte random key once
 * and keeps it in SiteSetting. It is real entropy, it survives redeploys (so
 * sessions are not silently invalidated), and it never reaches the browser or
 * the client bundle.
 *
 * The tradeoff, stated plainly: with the key in the database, a database leak
 * also leaks the ability to forge a session, which is not true when the key
 * lives only in the environment. Anyone holding the database already holds
 * every password hash and can insert their own administrator, so the marginal
 * loss is small — but set AUTH_SECRET in production and this path is never
 * taken.
 */
async function secret(): Promise<string> {
  if (cachedSecret) return cachedSecret;

  const fromEnv = process.env.AUTH_SECRET;
  if (fromEnv && fromEnv.length >= 16) {
    cachedSecret = fromEnv;
    return cachedSecret;
  }

  try {
    const existing = await db.siteSetting.findUnique({ where: { key: SECRET_SETTING_KEY } });
    const stored = existing ? (JSON.parse(existing.valueJson) as { value?: string }).value : null;
    if (stored && stored.length >= 32) {
      cachedSecret = stored;
      return cachedSecret;
    }

    const generated = randomBytes(64).toString("base64url");
    try {
      await db.siteSetting.create({
        data: { key: SECRET_SETTING_KEY, valueJson: JSON.stringify({ value: generated }) },
      });
      cachedSecret = generated;
    } catch {
      // Another instance won the race and created the row first. Read its value
      // rather than ours, or every instance would sign with a different key.
      const winner = await db.siteSetting.findUnique({ where: { key: SECRET_SETTING_KEY } });
      const value = winner ? (JSON.parse(winner.valueJson) as { value?: string }).value : null;
      if (!value) throw new Error("could not establish an auth secret");
      cachedSecret = value;
    }
    return cachedSecret;
  } catch (error) {
    if (process.env.NODE_ENV === "production") throw error;
    return "insecure-development-secret-do-not-use-in-production";
  }
}

/** Opaque, high-entropy token handed to the browser. */
export function createToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Only the HMAC of a token is stored server-side. */
export async function hashToken(token: string): Promise<string> {
  return createHmac("sha256", await secret()).update(token).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
