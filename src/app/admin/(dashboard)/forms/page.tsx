import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { parseJson } from "@/lib/json";
import { Card, EmptyState, PageHeader } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";
import { SubmissionsInbox } from "@/components/admin/SubmissionsInbox";
import type { FormFieldDef } from "@/lib/forms";
import { NewFormButton } from "@/components/admin/FormBuilder";

export const metadata: Metadata = { title: "Forms & Messages" };

export default async function FormsPage() {
  const user = await requirePermission("forms.view_submissions").catch(() => null);
  if (!user) notFound();

  const [forms, submissions] = await Promise.all([
    db.form.findMany({
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { submissions: true } } },
    }),
    db.formSubmission.findMany({
      where: { isArchived: false },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { form: { select: { id: true, name: true, fieldsJson: true } } },
    }),
  ]);

  const canManage = can(user.role, "forms.manage");

  return (
    <>
      <PageHeader
        title="Forms & Messages"
        description="Everything visitors send through the website, and the forms they send it with."
        actions={canManage ? <NewFormButton /> : null}
      />

      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <Card title="Forms">
          {forms.length === 0 ? (
            <EmptyState icon="mail" title="No forms yet" />
          ) : (
            <ul className="divide-y divide-[var(--a-line)]">
              {forms.map((form) => (
                <li key={form.id} className="flex items-center justify-between gap-2 p-3.5">
                  <span className="min-w-0">
                    <span className="block truncate text-[0.86rem] font-medium">{form.name}</span>
                    <span className="block truncate text-[0.7rem] text-[var(--a-faint)]">
                      /{form.slug} · {form._count.submissions} message
                      {form._count.submissions === 1 ? "" : "s"}
                    </span>
                  </span>
                  {canManage && (
                    <Link
                      href={`/admin/forms/${form.id}`}
                      className="a-btn a-btn-ghost a-btn-icon shrink-0"
                      aria-label={`Edit ${form.name}`}
                    >
                      <Icon name="edit" size={14} />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <SubmissionsInbox
          submissions={submissions.map((submission) => ({
            id: submission.id,
            formId: submission.form.id,
            formName: submission.form.name,
            fields: parseJson<FormFieldDef[]>(submission.form.fieldsJson, []),
            data: parseJson<Record<string, unknown>>(submission.dataJson, {}),
            isRead: submission.isRead,
            createdAt: submission.createdAt.toISOString(),
            ip: submission.ip ?? "",
          }))}
        />
      </div>
    </>
  );
}
