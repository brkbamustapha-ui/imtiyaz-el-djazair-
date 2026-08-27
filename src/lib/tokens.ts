import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET is missing or too short. Set a 32+ character random value in .env",
      );
    }
    return "insecure-development-secret-do-not-use-in-production";
  }
  return value;
}

/** Opaque, high-entropy token handed to the browser. */
export function createToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Only the HMAC of a token is stored server-side, so a DB leak is not a session leak. */
export function hashToken(token: string): string {
  return createHmac("sha256", secret()).update(token).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
