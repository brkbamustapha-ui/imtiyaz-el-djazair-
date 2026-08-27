"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteSubmissionAction,
  markAllReadAction,
  markSubmissionAction,
} from "@/app/admin/actions/forms";
import type { FormFieldDef } from "@/lib/forms";
import { Icon } from "@/components/ui/Icon";
import { Card, ConfirmButton, EmptyState, Modal, Notice } from "./ui";
import { formatDateTime, truncate } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Submission = {
  id: string;
  formId: string;
  formName: string;
  fields: FormFieldDef[];
  data: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
  ip: string;
};

type Attachment = { __attachment: true; originalName: string; storedAs: string; size: number };

function isAttachment(value: unknown): value is Attachment {
  return Boolean(value && typeof value === "object" && (value as Attachment).__attachment);
}

export function SubmissionsInbox({ submissions }: { submissions: Submission[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<Submission | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [, startTransition] = useTransition();

  const run = (action: () => Promise<{ ok: boolean; message: string }>, onDone?: () => void) => {
    startTransition(async () => {
      const result = await action();
      setMessage({ ok: result.ok, text: result.message });
      if (result.ok) onDone?.();
      router.refresh();
    });
  };

  const visible = submissions.filter((item) => filter === "all" || !item.isRead);
  const unread = submissions.filter((item) => !item.isRead).length;

  const summarise = (submission: Submission) => {
    const values = Object.entries(submission.data)
      .filter(([, value]) => typeof value === "string" && value.trim() !== "")
      .map(([, value]) => String(value));
    return {
      title: String(submission.data.fullName ?? submission.data.name ?? submission.data.email ?? "Message"),
      body: truncate(values.slice(1).join(" · "), 110),
    };
  };

  return (
    <>
      <Card
        title="Messages"
        description={unread > 0 ? `${unread} unread` : "All messages read"}
        actions={
          <>
            <button
              type="button"
              className={`a-btn a-btn-sm ${filter === "all" ? "a-btn-primary" : "a-btn-ghost"}`}
              onClick={() => setFilter("all")}
            >
              All
            </button>
            <button
              type="button"
              className={`a-btn a-btn-sm ${filter === "unread" ? "a-btn-primary" : "a-btn-ghost"}`}
              onClick={() => setFilter("unread")}
            >
              Unread
            </button>
            {unread > 0 && submissions[0] && (
              <button
                type="button"
                className="a-btn a-btn-ghost a-btn-sm"
                onClick={() => run(() => markAllReadAction(submissions[0].formId))}
              >
                Mark all read
              </button>
            )}
          </>
        }
      >
        {message && (
          <div className="p-4 pb-0">
            <Notice tone={message.ok ? "success" : "danger"}>{message.text}</Notice>
          </div>
        )}

        {visible.length === 0 ? (
          <EmptyState
            icon="mail"
            title={filter === "unread" ? "Nothing unread" : "No messages yet"}
            description="Submissions from the website's contact form land here."
          />
        ) : (
          <ul className="divide-y divide-[var(--a-line)]">
            {visible.map((submission) => {
              const preview = summarise(submission);
              return (
                <li key={submission.id}>
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 p-4 text-start transition-colors hover:bg-[color-mix(in_srgb,var(--a-text)_3%,transparent)]"
                    onClick={() => {
                      setOpen(submission);
                      if (!submission.isRead) {
                        run(() => markSubmissionAction(submission.id, { isRead: true }));
                      }
                    }}
                  >
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                        submission.isRead ? "bg-[var(--a-line)]" : "bg-[var(--a-brand)]",
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-[0.9rem]", !submission.isRead && "font-semibold")}>
                        {preview.title}
                      </span>
                      <span className="block truncate text-[0.78rem] text-[var(--a-muted)]">
                        {preview.body || "—"}
                      </span>
                      <span className="mt-1 block text-[0.68rem] text-[var(--a-faint)]">
                        {submission.formName} · {formatDateTime(submission.createdAt)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {open && (
        <Modal
          open
          onClose={() => setOpen(null)}
          title={`Message · ${open.formName}`}
          size="lg"
          footer={
            <>
              <button
                type="button"
                className="a-btn a-btn-ghost"
                onClick={() => run(() => markSubmissionAction(open.id, { isRead: !open.isRead }))}
              >
                Mark as {open.isRead ? "unread" : "read"}
              </button>
              <button
                type="button"
                className="a-btn a-btn-outline"
                onClick={() =>
                  run(() => markSubmissionAction(open.id, { isArchived: true }), () => setOpen(null))
                }
              >
                Archive
              </button>
              <ConfirmButton
                label="Delete"
                confirmTitle="Delete this message?"
                confirmBody="It is removed permanently."
                onConfirm={() => run(() => deleteSubmissionAction(open.id), () => setOpen(null))}
              />
            </>
          }
        >
          <dl className="space-y-4">
            {Object.entries(open.data).map(([key, value]) => {
              const definition = open.fields.find((field) => field.name === key);
              const label = definition ? t(definition.label, "en") : key;
              return (
                <div key={key}>
                  <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.09em] text-[var(--a-faint)]">
                    {label}
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap break-words text-[0.9rem]">
                    {isAttachment(value) ? (
                      <a
                        href={`/admin/api/attachment/${encodeURIComponent(value.storedAs)}`}
                        className="a-btn a-btn-outline a-btn-sm"
                      >
                        <Icon name="folder" size={13} />
                        {value.originalName}
                      </a>
                    ) : (
                      String(value) || "—"
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>

          <p className="mt-6 border-t border-[var(--a-line)] pt-4 text-[0.72rem] text-[var(--a-faint)]">
            Received {formatDateTime(open.createdAt)}
            {open.ip ? ` from ${open.ip}` : ""}
          </p>

          {typeof open.data.email === "string" && open.data.email && (
            <a
              href={`mailto:${open.data.email}?subject=${encodeURIComponent(`Re: ${open.formName}`)}`}
              className="a-btn a-btn-primary a-btn-sm mt-4"
            >
              <Icon name="mail" size={14} />
              Reply by email
            </a>
          )}
        </Modal>
      )}
    </>
  );
}
