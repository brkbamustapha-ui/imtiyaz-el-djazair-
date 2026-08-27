import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { parseJson } from "@/lib/json";
import { Card, EmptyState, PageHeader } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Activity log" };

const PAGE_SIZE = 60;

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requirePermission("audit.view").catch(() => null);
  if (!user) notFound();

  const { page } = await searchParams;
  const current = Math.max(1, Number(page ?? 1) || 1);

  const [entries, total] = await Promise.all([
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (current - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { name: true, email: true } } },
    }),
    db.auditLog.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Activity log"
        description="Who changed what, and when. Sign-in attempts are recorded too — passwords never are."
      />

      <Card>
        {entries.length === 0 ? (
          <EmptyState icon="clock" title="Nothing logged yet" />
        ) : (
          <div className="a-scroll-x">
            <table className="a-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Who</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const meta = parseJson<Record<string, unknown>>(entry.metaJson, {});
                  const metaText = Object.entries(meta)
                    .map(([key, value]) => `${key}: ${String(value)}`)
                    .join(", ");
                  return (
                    <tr key={entry.id}>
                      <td className="whitespace-nowrap text-[0.78rem] text-[var(--a-muted)]">
                        {formatDateTime(entry.createdAt)}
                      </td>
                      <td className="text-[0.82rem]">
                        {entry.user?.name ?? "System"}
                        {entry.ip && (
                          <span className="block text-[0.68rem] text-[var(--a-faint)]">{entry.ip}</span>
                        )}
                      </td>
                      <td>
                        <code className="a-mono">{entry.action}</code>
                      </td>
                      <td className="text-[0.78rem] text-[var(--a-muted)]">
                        {entry.entityType}
                        {entry.entityId && (
                          <span className="block truncate text-[0.68rem] text-[var(--a-faint)]">
                            {entry.entityId}
                          </span>
                        )}
                      </td>
                      <td className="max-w-[220px] truncate text-[0.76rem] text-[var(--a-muted)]">
                        {metaText || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <nav className="flex items-center justify-center gap-2 border-t border-[var(--a-line)] p-4">
            {Array.from({ length: Math.min(totalPages, 12) }).map((_, index) => {
              const number = index + 1;
              return (
                <a
                  key={number}
                  href={`/admin/activity?page=${number}`}
                  className={`a-btn a-btn-sm ${number === current ? "a-btn-primary" : "a-btn-ghost"}`}
                >
                  {number}
                </a>
              );
            })}
          </nav>
        )}
      </Card>
    </>
  );
}
