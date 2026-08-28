import "server-only";
import { cookies, headers } from "next/headers";
import { hashToken, safeEqual } from "./tokens";

export const CSRF_COOKIE = "ied_csrf";

/**
 * Double-submit CSRF token for the REST endpoints (public forms, uploads).
 * The cookie itself is issued by `middleware.ts` — a server component cannot
 * write cookies during render — so this only reads it back.
 * Server Actions are separately protected by Next.js' own origin check.
 */
export async function ensureCsrfToken(): Promise<string> {
  return (await cookies()).get(CSRF_COOKIE)?.value ?? "";
}

export async function readCsrfCookie(): Promise<string | null> {
  return (await cookies()).get(CSRF_COOKIE)?.value ?? null;
}

/** Verifies the double-submit token AND that the request came from our origin. */
export async function verifyCsrf(submittedToken: string | null): Promise<boolean> {
  const cookieToken = await readCsrfCookie();
  if (!cookieToken || !submittedToken) return false;
  const [a, b] = await Promise.all([hashToken(cookieToken), hashToken(submittedToken)]);
  if (!safeEqual(a, b)) return false;
  return verifySameOrigin();
}

export async function verifySameOrigin(): Promise<boolean> {
  const headerList = await headers();
  const origin = headerList.get("origin");
  if (!origin) return true; // plain form posts and same-origin navigations send none
  const host = headerList.get("host");
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
