import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { createToken, hashToken } from "./tokens";
import { can, type Permission, type Role } from "./permissions";

export const SESSION_COOKIE = "ied_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours
const SESSION_REFRESH_MS = 1000 * 60 * 30; // slide the expiry at most twice an hour

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
  mustChangePassword: boolean;
};

export type SessionContext = { user: AuthUser; sessionId: string };

function isProduction() {
  return process.env.NODE_ENV === "production";
}

export async function createSession(userId: string): Promise<string> {
  const token = createToken(32);
  const headerList = await headers();
  await db.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      ip: clientIpFrom(headerList),
      userAgent: (headerList.get("user-agent") ?? "").slice(0, 250),
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return token;
}

export async function destroyCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session
      .deleteMany({ where: { tokenHash: hashToken(token) } })
      .catch(() => undefined);
  }
  cookieStore.delete(SESSION_COOKIE);
}

/** Cached per request: the admin shell + every server action can call it freely. */
export const getSessionContext = cache(async function getSessionContext(): Promise<SessionContext | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session
    .findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    })
    .catch(() => null);

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  if (!session.user.isActive) return null;

  if (Date.now() - session.lastSeenAt.getTime() > SESSION_REFRESH_MS) {
    await db.session
      .update({
        where: { id: session.id },
        data: {
          lastSeenAt: new Date(),
          expiresAt: new Date(Date.now() + SESSION_TTL_MS),
        },
      })
      .catch(() => undefined);
  }

  return {
    sessionId: session.id,
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role as Role,
      avatarUrl: session.user.avatarUrl,
      mustChangePassword: session.user.mustChangePassword,
    },
  };
});

export async function getCurrentUser(): Promise<AuthUser | null> {
  return (await getSessionContext())?.user ?? null;
}

/** Redirects to the login page when there is no valid session. */
export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  return user;
}

/**
 * Server-action guard. Throws (rather than redirecting) so the caller can turn
 * it into a form error. Every mutating action calls this — the UI hiding a
 * button is never the only thing standing between a role and an action.
 */
export async function requirePermission(permission: Permission): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated.");
  if (!can(user.role, permission)) {
    throw new Error("You do not have permission to perform this action.");
  }
  return user;
}

export async function revokeAllSessionsForUser(userId: string, exceptSessionId?: string) {
  await db.session.deleteMany({
    where: { userId, ...(exceptSessionId ? { NOT: { id: exceptSessionId } } : {}) },
  });
}

export function clientIpFrom(headerList: Headers): string {
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim().slice(0, 60);
  return (headerList.get("x-real-ip") ?? "unknown").slice(0, 60);
}

export async function clientIp(): Promise<string> {
  return clientIpFrom(await headers());
}
