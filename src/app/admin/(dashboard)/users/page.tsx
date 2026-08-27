import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { UsersManager } from "@/components/admin/UsersManager";

export const metadata: Metadata = { title: "Users & Roles" };

export default async function UsersPage() {
  const actor = await requirePermission("users.manage").catch(() => null);
  if (!actor) notFound();
  const current = await getCurrentUser();

  const users = await db.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { sessions: true } } },
  });

  return (
    <>
      <PageHeader
        title="Users & Roles"
        description="Who can sign in, and what each of them is allowed to do."
      />
      <UsersManager
        currentUserId={current?.id ?? ""}
        actorRole={actor.role}
        users={users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          mustChangePassword: user.mustChangePassword,
          lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
          lockedUntil: user.lockedUntil?.toISOString() ?? null,
          activeSessions: user._count.sessions,
        }))}
      />
    </>
  );
}
