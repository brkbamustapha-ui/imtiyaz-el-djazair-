import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getSetting } from "@/lib/settings";
import { Card, EmptyState, Notice, PageHeader, StatCard } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";
import { formatDateTime } from "@/lib/utils";
import { VisitorsChart } from "@/components/admin/VisitorsChart";

export const metadata: Metadata = { title: "Dashboard" };

function startOfDay(offsetDays = 0) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - offsetDays);
  return date;
}

export default async function DashboardPage() {
  const user = await requireUser();
  const since30 = startOfDay(29);

  const [
    visits30,
    uniqueVisitors,
    unreadMessages,
    totalMessages,
    postCount,
    eventCount,
    testimonialCount,
    pageCount,
    mediaCount,
    recentSubmissions,
    recentActivity,
    dailyVisits,
    general,
  ] = await Promise.all([
    db.visitEvent.count({ where: { createdAt: { gte: since30 } } }),
    db.visitEvent
      .findMany({ where: { createdAt: { gte: since30 } }, distinct: ["visitorKey"], select: { id: true } })
      .then((rows) => rows.length),
    db.formSubmission.count({ where: { isRead: false, isArchived: false } }),
    db.formSubmission.count(),
    db.post.count({ where: { type: "NEWS" } }),
    db.post.count({ where: { type: "EVENT" } }),
    db.testimonial.count(),
    db.page.count(),
    db.mediaAsset.count(),
    db.formSubmission.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { form: { select: { name: true, slug: true, id: true } } },
    }),
    can(user.role, "audit.view")
      ? db.auditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 8,
          include: { user: { select: { name: true } } },
        })
      : Promise.resolve([]),
    db.visitEvent.findMany({
      where: { createdAt: { gte: since30 } },
      select: { createdAt: true },
    }),
    getSetting("general"),
  ]);

  // Bucket page views by day for the sparkline.
  const buckets = new Map<string, number>();
  for (let index = 29; index >= 0; index -= 1) {
    buckets.set(startOfDay(index).toISOString().slice(0, 10), 0);
  }
  dailyVisits.forEach((visit) => {
    const key = visit.createdAt.toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  });
  const series = Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        description="Everything on the public website is managed from here — content, design, media and messages."
        actions={
          can(user.role, "content.edit") ? (
            <Link href="/admin/builder" className="a-btn a-btn-primary">
              <Icon name="edit" size={16} />
              Edit website
            </Link>
          ) : null
        }
      />

      {general.demoContentNotice && (
        <div className="mb-6">
          <Notice tone="warn">
            <strong>This site still contains demo content.</strong> Replace the placeholder
            partner logos, photos, statistics and articles before going live — then turn this
            reminder off in{" "}
            <Link href="/admin/settings" className="underline underline-offset-2">
              Site settings
            </Link>
            .
          </Notice>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Page views (30 days)" value={visits30.toLocaleString()} icon="chart" hint={`${uniqueVisitors.toLocaleString()} unique visitors`} />
        <StatCard label="Unread messages" value={unreadMessages} icon="mail" tone={unreadMessages > 0 ? "warn" : "neutral"} hint={`${totalMessages} received in total`} />
        <StatCard label="News & events" value={postCount + eventCount} icon="news" hint={`${postCount} news · ${eventCount} events`} />
        <StatCard label="Pages" value={pageCount} icon="grid" hint={`${mediaCount} files · ${testimonialCount} testimonials`} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card title="Traffic" description="Page views over the last 30 days, counted first-party.">
          <div className="p-5">
            <VisitorsChart data={series} />
          </div>
        </Card>

        <Card
          title="Latest messages"
          actions={
            can(user.role, "forms.view_submissions") ? (
              <Link href="/admin/forms" className="a-btn a-btn-ghost a-btn-sm">
                View all
              </Link>
            ) : null
          }
        >
          {recentSubmissions.length === 0 ? (
            <EmptyState icon="mail" title="No messages yet" description="Submissions from the website's forms appear here." />
          ) : (
            <ul className="divide-y divide-[var(--a-line)]">
              {recentSubmissions.map((submission) => {
                const preview = summarise(submission.dataJson);
                return (
                  <li key={submission.id} className="flex items-start gap-3 p-4">
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ background: submission.isRead ? "var(--a-line)" : "var(--a-brand)" }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.86rem] font-medium">{preview.title}</p>
                      <p className="mt-0.5 truncate text-xs text-[var(--a-muted)]">{preview.body}</p>
                      <p className="mt-1 text-[0.68rem] text-[var(--a-faint)]">
                        {submission.form.name} · {formatDateTime(submission.createdAt)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card title="Quick actions">
          <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
            {[
              { href: "/admin/builder", label: "Edit sections", icon: "layers", permission: "content.edit" as const },
              { href: "/admin/posts/new", label: "Write news", icon: "news", permission: "content.edit" as const },
              { href: "/admin/media", label: "Upload media", icon: "upload", permission: "media.upload" as const },
              { href: "/admin/partners", label: "Partner logos", icon: "handshake", permission: "partners.manage" as const },
              { href: "/admin/appearance", label: "Colours & fonts", icon: "palette", permission: "appearance.manage" as const },
              { href: "/admin/settings", label: "Contact details", icon: "settings", permission: "seo.manage" as const },
            ]
              .filter((action) => can(user.role, action.permission))
              .map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex flex-col items-center gap-2 rounded-[var(--a-radius-sm)] border border-[var(--a-line)] p-4 text-center text-xs font-medium transition-colors hover:border-[var(--a-brand)] hover:text-[var(--a-brand)]"
                >
                  <Icon name={action.icon} size={19} />
                  {action.label}
                </Link>
              ))}
          </div>
        </Card>

        {can(user.role, "audit.view") && (
          <Card
            title="Recent activity"
            actions={
              <Link href="/admin/activity" className="a-btn a-btn-ghost a-btn-sm">
                Full log
              </Link>
            }
          >
            {recentActivity.length === 0 ? (
              <EmptyState icon="clock" title="Nothing logged yet" />
            ) : (
              <ul className="divide-y divide-[var(--a-line)]">
                {recentActivity.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="min-w-0">
                      <span className="block truncate text-[0.84rem]">
                        {describeAction(entry.action)}
                        {entry.entityType && (
                          <span className="text-[var(--a-faint)]"> · {entry.entityType}</span>
                        )}
                      </span>
                      <span className="text-[0.68rem] text-[var(--a-faint)]">
                        {entry.user?.name ?? "System"} · {formatDateTime(entry.createdAt)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </>
  );
}

function summarise(dataJson: string): { title: string; body: string } {
  try {
    const data = JSON.parse(dataJson) as Record<string, unknown>;
    const name = String(data.fullName ?? data.name ?? data.email ?? "Message");
    const body = String(data.message ?? data.subject ?? "").slice(0, 90);
    return { title: name, body: body || "—" };
  } catch {
    return { title: "Message", body: "—" };
  }
}

const ACTION_LABELS: Record<string, string> = {
  "auth.login": "Signed in",
  "auth.logout": "Signed out",
  "auth.login_failed": "Failed sign-in attempt",
  "auth.password_changed": "Password changed",
  "auth.password_reset": "Password reset",
  "auth.profile_updated": "Profile updated",
  "auth.sessions_revoked": "Other sessions revoked",
  "auth.reset_requested": "Password reset requested",
  "section.updated": "Section edited",
  "section.published": "Section published",
  "section.created": "Section added",
  "section.deleted": "Section removed",
  "section.reordered": "Sections reordered",
  "section.restored": "Version restored",
  "settings.updated": "Settings updated",
  "media.uploaded": "File uploaded",
  "media.deleted": "File deleted",
  "user.created": "User created",
  "user.updated": "User updated",
  "user.deleted": "User deleted",
};

function describeAction(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/[._]/g, " ");
}
