import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser, getSessionContext } from "@/lib/auth";
import { ROLE_LABELS, type Role } from "@/lib/permissions";
import { Card, Notice, PageHeader } from "@/components/admin/ui";
import { AccountForms } from "@/components/admin/AccountForms";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Account & Security" };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ first?: string }>;
}) {
  const user = await requireUser();
  const context = await getSessionContext();
  const { first } = await searchParams;

  const sessions = await db.session.findMany({
    where: { userId: user.id },
    orderBy: { lastSeenAt: "desc" },
    take: 10,
  });

  return (
    <>
      <PageHeader
        title="Account & Security"
        description="Your sign-in details, password and active sessions."
      />

      {(first === "1" || user.mustChangePassword) && (
        <div className="mb-5">
          <Notice tone="warn">
            <strong>Change your password before you carry on.</strong> The account was created with
            a password from the server configuration — replace it with one only you know. Once you
            have, clear <code className="a-mono">ADMIN_PASSWORD</code> from the server&apos;s
            <code className="a-mono"> .env</code> file.
          </Notice>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <AccountForms
          initialName={user.name}
          initialEmail={user.email}
          role={ROLE_LABELS[user.role as Role] ?? user.role}
        />

        <Card title="Active sessions" description="Every browser currently signed in as you.">
          <ul className="divide-y divide-[var(--a-line)]">
            {sessions.map((session) => (
              <li key={session.id} className="p-4">
                <p className="flex items-center gap-2 text-[0.86rem] font-medium">
                  {session.id === context?.sessionId ? "This device" : "Other device"}
                  {session.id === context?.sessionId && (
                    <span className="a-badge a-badge-success">Current</span>
                  )}
                </p>
                <p className="mt-1 break-all text-[0.72rem] text-[var(--a-muted)]">
                  {session.userAgent || "Unknown browser"}
                </p>
                <p className="mt-1 text-[0.7rem] text-[var(--a-faint)]">
                  Last active {formatDateTime(session.lastSeenAt)} · expires{" "}
                  {formatDateTime(session.expiresAt)}
                  {session.ip ? ` · ${session.ip}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
