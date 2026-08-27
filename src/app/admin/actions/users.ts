"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission, getCurrentUser, revokeAllSessionsForUser } from "@/lib/auth";
import { hashPassword, checkPasswordStrength } from "@/lib/password";
import { logAdminAction } from "@/lib/audit";
import { ROLES, type Role } from "@/lib/permissions";
import { fail, ok, type ActionResult } from "./_helpers";

const userSchema = z.object({
  name: z.string().trim().min(2, "Enter a name.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  role: z.enum(ROLES),
  isActive: z.boolean(),
});

/** Only a Super Admin may create or modify another Super Admin. */
async function assertCanTargetRole(actorRole: Role, targetRole: Role): Promise<string | null> {
  if (targetRole === "SUPER_ADMIN" && actorRole !== "SUPER_ADMIN") {
    return "Only a Super Admin can manage another Super Admin.";
  }
  return null;
}

export async function createUserAction(input: {
  name: string;
  email: string;
  role: string;
  password: string;
}): Promise<ActionResult> {
  const actor = await requirePermission("users.manage").catch(() => null);
  if (!actor) return fail("You do not have permission to manage users.");

  const parsed = userSchema.safeParse({ ...input, isActive: true });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form.");

  const roleError = await assertCanTargetRole(actor.role, parsed.data.role);
  if (roleError) return fail(roleError);

  const strength = checkPasswordStrength(input.password);
  if (!strength.ok) return fail(strength.problems.join(" "));

  if (await db.user.findUnique({ where: { email: parsed.data.email } })) {
    return fail("An account already uses that email address.");
  }

  const created = await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      isActive: true,
      // The new user must pick their own password at first sign-in.
      mustChangePassword: true,
      passwordHash: await hashPassword(input.password),
    },
  });

  await logAdminAction({
    userId: actor.id,
    action: "user.created",
    entityType: "user",
    entityId: created.id,
    meta: { role: parsed.data.role },
  });
  revalidatePath("/admin/users");
  return ok(`${parsed.data.name} can now sign in and will be asked to set a new password.`, created.id);
}

export async function updateUserAction(
  userId: string,
  input: { name: string; email: string; role: string; isActive: boolean },
): Promise<ActionResult> {
  const actor = await requirePermission("users.manage").catch(() => null);
  if (!actor) return fail("You do not have permission to manage users.");

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return fail("That user no longer exists.");

  const parsed = userSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form.");

  const roleError =
    (await assertCanTargetRole(actor.role, target.role as Role)) ??
    (await assertCanTargetRole(actor.role, parsed.data.role));
  if (roleError) return fail(roleError);

  // Never let the last active Super Admin be demoted or disabled.
  if (target.role === "SUPER_ADMIN" && (parsed.data.role !== "SUPER_ADMIN" || !parsed.data.isActive)) {
    const remaining = await db.user.count({
      where: { role: "SUPER_ADMIN", isActive: true, NOT: { id: userId } },
    });
    if (remaining === 0) {
      return fail("This is the last active Super Admin — promote someone else first.");
    }
  }

  if (parsed.data.email !== target.email) {
    const clash = await db.user.findUnique({ where: { email: parsed.data.email } });
    if (clash) return fail("An account already uses that email address.");
  }

  await db.user.update({
    where: { id: userId },
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      isActive: parsed.data.isActive,
    },
  });

  // A disabled or demoted account should not keep an open session.
  if (!parsed.data.isActive || parsed.data.role !== target.role) {
    await revokeAllSessionsForUser(userId);
  }

  await logAdminAction({ userId: actor.id, action: "user.updated", entityType: "user", entityId: userId });
  revalidatePath("/admin/users");
  return ok("User saved.");
}

export async function resetUserPasswordAction(
  userId: string,
  newPassword: string,
): Promise<ActionResult> {
  const actor = await requirePermission("users.manage").catch(() => null);
  if (!actor) return fail("Not allowed.");

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return fail("That user no longer exists.");

  const roleError = await assertCanTargetRole(actor.role, target.role as Role);
  if (roleError) return fail(roleError);

  const strength = checkPasswordStrength(newPassword);
  if (!strength.ok) return fail(strength.problems.join(" "));

  await db.user.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(newPassword),
      mustChangePassword: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });
  await revokeAllSessionsForUser(userId);

  await logAdminAction({ userId: actor.id, action: "user.password_reset", entityType: "user", entityId: userId });
  revalidatePath("/admin/users");
  return ok("Temporary password set. The user must change it at next sign-in.");
}

export async function deleteUserAction(userId: string): Promise<ActionResult> {
  const actor = await requirePermission("users.manage").catch(() => null);
  if (!actor) return fail("Not allowed.");

  const current = await getCurrentUser();
  if (current?.id === userId) return fail("You cannot delete your own account.");

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return fail("That user no longer exists.");

  const roleError = await assertCanTargetRole(actor.role, target.role as Role);
  if (roleError) return fail(roleError);

  if (target.role === "SUPER_ADMIN") {
    const remaining = await db.user.count({
      where: { role: "SUPER_ADMIN", isActive: true, NOT: { id: userId } },
    });
    if (remaining === 0) return fail("This is the last Super Admin and cannot be deleted.");
  }

  await db.user.delete({ where: { id: userId } });
  await logAdminAction({ userId: actor.id, action: "user.deleted", entityType: "user", entityId: userId, meta: { email: target.email } });
  revalidatePath("/admin/users");
  return ok("User deleted.");
}
