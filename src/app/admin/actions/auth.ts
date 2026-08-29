"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword, checkPasswordStrength } from "@/lib/password";
import { createToken, hashToken } from "@/lib/tokens";
import {
  clientIp,
  clientIpFrom,
  createSession,
  destroyCurrentSession,
  getSessionContext,
  requireUser,
  revokeAllSessionsForUser,
} from "@/lib/auth";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { logAdminAction } from "@/lib/audit";
import { verifySameOrigin } from "@/lib/csrf";
import { siteUrl } from "@/lib/seo";

export type ActionState = { ok?: boolean; message?: string } | null;

const MAX_FAILED_ATTEMPTS = 6;
const LOCK_MINUTES = 15;
/** Deliberately vague so the form never reveals whether an account exists. */
const GENERIC_LOGIN_ERROR = "Incorrect email or password.";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional(),
});

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await verifySameOrigin())) {
    return { ok: false, message: "Request rejected." };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    // FormData returns null for a missing field, which `.optional()` rejects.
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  const { email, password } = parsed.data;

  const ip = await clientIp();
  // Two layers: per-IP (stops spraying) and per-account (stops targeted guessing).
  const ipLimit = rateLimit(`login:ip:${ip}`, 12, 10 * 60 * 1000);
  const accountLimit = rateLimit(`login:acct:${email}`, 8, 10 * 60 * 1000);
  if (!ipLimit.allowed || !accountLimit.allowed) {
    const wait = Math.max(ipLimit.retryAfterSeconds, accountLimit.retryAfterSeconds);
    return {
      ok: false,
      message: `Too many attempts. Try again in ${Math.ceil(wait / 60)} minute(s).`,
    };
  }

  await db.loginAttempt.create({ data: { key: email, success: false } }).catch(() => undefined);

  const user = await db.user.findUnique({ where: { email } });

  // Always run a hash comparison so response time does not reveal whether the
  // account exists.
  const storedHash =
    user?.passwordHash ??
    "scrypt$00000000000000000000000000000000$" + "0".repeat(128);
  const passwordOk = await verifyPassword(password, storedHash);

  if (!user || !user.isActive) {
    return { ok: false, message: GENERIC_LOGIN_ERROR };
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return {
      ok: false,
      message: `This account is temporarily locked. Try again in ${minutes} minute(s).`,
    };
  }

  if (!passwordOk) {
    const failed = user.failedLoginAttempts + 1;
    await db.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: failed,
        lockedUntil:
          failed >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
      },
    });
    await logAdminAction({
      userId: user.id,
      action: "auth.login_failed",
      entityType: "user",
      entityId: user.id,
      meta: { attempts: failed },
    });
    if (failed >= MAX_FAILED_ATTEMPTS) {
      return {
        ok: false,
        message: `Too many failed attempts. This account is locked for ${LOCK_MINUTES} minutes.`,
      };
    }
    return { ok: false, message: GENERIC_LOGIN_ERROR };
  }

  await db.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  await db.loginAttempt.create({ data: { key: email, success: true } }).catch(() => undefined);
  resetRateLimit(`login:acct:${email}`);

  await createSession(user.id);
  await logAdminAction({ userId: user.id, action: "auth.login", entityType: "user", entityId: user.id });

  const requested = parsed.data.next ?? "";
  const safeNext =
    requested.startsWith("/admin") && !requested.startsWith("//") ? requested : "/admin";

  redirect(user.mustChangePassword ? "/admin/account?first=1" : safeNext);
}

export async function signOutAction() {
  const context = await getSessionContext();
  if (context) {
    await logAdminAction({
      userId: context.user.id,
      action: "auth.logout",
      entityType: "user",
      entityId: context.user.id,
    });
  }
  await destroyCurrentSession();
  redirect("/admin/login");
}

/* ------------------------------ Account & security ------------------------ */

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  newPassword: z.string().min(1, "Enter a new password."),
  confirmPassword: z.string().min(1, "Confirm the new password."),
});

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const { currentPassword, newPassword, confirmPassword } = parsed.data;

  if (newPassword !== confirmPassword) {
    return { ok: false, message: "The new passwords do not match." };
  }
  const strength = checkPasswordStrength(newPassword);
  if (!strength.ok) {
    return { ok: false, message: strength.problems.join(" ") };
  }

  const record = await db.user.findUnique({ where: { id: user.id } });
  if (!record || !(await verifyPassword(currentPassword, record.passwordHash))) {
    return { ok: false, message: "Your current password is not correct." };
  }
  if (await verifyPassword(newPassword, record.passwordHash)) {
    return { ok: false, message: "Choose a password you have not used here before." };
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword), mustChangePassword: false },
  });

  // Every other device is signed out when the password changes.
  const context = await getSessionContext();
  await revokeAllSessionsForUser(user.id, context?.sessionId);

  await logAdminAction({ userId: user.id, action: "auth.password_changed", entityType: "user", entityId: user.id });
  return { ok: true, message: "Password updated. Other devices have been signed out." };
}

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Confirm with your current password."),
});

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const record = await db.user.findUnique({ where: { id: user.id } });
  if (!record || !(await verifyPassword(parsed.data.password, record.passwordHash))) {
    return { ok: false, message: "Your password is not correct." };
  }

  if (parsed.data.email !== record.email) {
    const taken = await db.user.findUnique({ where: { email: parsed.data.email } });
    if (taken) return { ok: false, message: "That email address is already in use." };
  }

  await db.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name, email: parsed.data.email },
  });
  await logAdminAction({ userId: user.id, action: "auth.profile_updated", entityType: "user", entityId: user.id });
  return { ok: true, message: "Your details have been updated." };
}

export async function revokeOtherSessionsAction(): Promise<ActionState> {
  const context = await getSessionContext();
  if (!context) return { ok: false, message: "Not signed in." };
  await revokeAllSessionsForUser(context.user.id, context.sessionId);
  await logAdminAction({
    userId: context.user.id,
    action: "auth.sessions_revoked",
    entityType: "user",
    entityId: context.user.id,
  });
  return { ok: true, message: "All other sessions have been signed out." };
}

/* ------------------------------ Password reset ---------------------------- */

const RESET_TTL_MINUTES = 30;

export async function requestPasswordResetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const headerList = await headers();
  const ip = clientIpFrom(headerList);

  if (!rateLimit(`reset:${ip}`, 5, 15 * 60 * 1000).allowed) {
    return { ok: false, message: "Too many requests. Please try again later." };
  }

  // The same answer is returned whether or not the account exists.
  const confirmation =
    "If an account exists for that address, a reset link has been generated. Ask your Super Admin for it if no email arrives.";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { ok: true, message: confirmation };
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return { ok: true, message: confirmation };

  const token = createToken(32);
  await db.user.update({
    where: { id: user.id },
    data: {
      resetTokenHash: await hashToken(token),
      resetTokenExpiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60_000),
    },
  });

  const link = `/admin/reset-password?token=${token}`;
  await logAdminAction({
    userId: user.id,
    action: "auth.reset_requested",
    entityType: "user",
    entityId: user.id,
  });

  // No mail transport is configured out of the box. Rather than pretend an
  // email was sent, the link is written to the server log so the Super Admin
  // can pass it on. Wire up an SMTP/provider call here to email it instead.
  console.info(
    `[password-reset] ${email} -> ${siteUrl(link)} (valid ${RESET_TTL_MINUTES} min)`,
  );

  return { ok: true, message: confirmation };
}

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (!token) return { ok: false, message: "This reset link is not valid." };
  if (password !== confirm) return { ok: false, message: "The passwords do not match." };

  const strength = checkPasswordStrength(password);
  if (!strength.ok) return { ok: false, message: strength.problems.join(" ") };

  const user = await db.user.findFirst({
    where: { resetTokenHash: await hashToken(token), resetTokenExpiresAt: { gt: new Date() } },
  });
  if (!user) return { ok: false, message: "This reset link has expired. Request a new one." };

  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(password),
      resetTokenHash: null,
      resetTokenExpiresAt: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      mustChangePassword: false,
    },
  });
  await revokeAllSessionsForUser(user.id);
  await logAdminAction({ userId: user.id, action: "auth.password_reset", entityType: "user", entityId: user.id });

  return { ok: true, message: "Your password has been reset. You can now sign in." };
}
