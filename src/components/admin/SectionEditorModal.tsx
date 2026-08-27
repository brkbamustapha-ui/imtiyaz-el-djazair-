"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  discardDraftAction,
  listSectionVersionsAction,
  publishSectionAction,
  restoreVersionAction,
  saveSectionDraftAction,
  type SectionVersion,
} from "@/app/admin/actions/content";
import { getSectionType } from "@/lib/section-types";
import type { Locale } from "@/lib/i18n";
import { FieldsEditor, type FieldValues } from "./FieldsEditor";
import { ConfirmButton, Modal, Notice, Spinner } from "./ui";
import { Icon } from "@/components/ui/Icon";
import { formatDateTime } from "@/lib/utils";

export type BuilderSection = {
  id: string;
  type: string;
  name: string;
  order: number;
  isEnabled: boolean;
  data: FieldValues;
  hasDraft: boolean;
};

export function SectionEditorModal({
  section,
  open,
  onClose,
  onSaved,
  locales,
  canPublish,
}: {
  section: BuilderSection | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  locales: Locale[];
  canPublish: boolean;
}) {
  const [values, setValues] = useState<FieldValues>({});
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [versions, setVersions] = useState<SectionVersion[] | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (section) {
      setValues(section.data);
      setDirty(false);
      setMessage(null);
      setVersions(null);
    }
  }, [section]);

  if (!section) return null;
  const definition = getSectionType(section.type);

  const run = (action: () => Promise<{ ok: boolean; message: string }>) => {
    startTransition(async () => {
      const result = await action();
      setMessage({ ok: result.ok, text: result.message });
      if (result.ok) {
        setDirty(false);
        onSaved();
        router.refresh();
      }
    });
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (dirty && !window.confirm("You have unsaved changes. Close anyway?")) return;
        onClose();
      }}
      title={`Edit: ${section.name}`}
      size="xl"
      footer={
        <>
          {section.hasDraft && (
            <ConfirmButton
              label="Discard draft"
              variant="ghost"
              confirmTitle="Discard the unpublished draft?"
              confirmBody="The published version stays exactly as it is."
              onConfirm={() => run(() => discardDraftAction(section.id))}
            />
          )}
          <span className="flex-1" />
          <button type="button" className="a-btn a-btn-ghost" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="a-btn a-btn-outline"
            disabled={pending}
            onClick={() => run(() => saveSectionDraftAction(section.id, values))}
          >
            {pending && <Spinner />}
            Save draft
          </button>
          {canPublish && (
            <button
              type="button"
              className="a-btn a-btn-primary"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const saved = await saveSectionDraftAction(section.id, values);
                  if (!saved.ok) {
                    setMessage({ ok: false, text: saved.message });
                    return;
                  }
                  const published = await publishSectionAction(section.id);
                  setMessage({ ok: published.ok, text: published.message });
                  if (published.ok) {
                    setDirty(false);
                    onSaved();
                    router.refresh();
                  }
                })
              }
            >
              {pending && <Spinner />}
              Save &amp; publish
            </button>
          )}
        </>
      }
    >
      {!definition ? (
        <Notice tone="danger">
          This section has an unknown type (<code>{section.type}</code>) and cannot be edited here.
        </Notice>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="a-badge a-badge-neutral">{definition.label}</span>
            {definition.dataSource && (
              <span className="a-badge a-badge-brand">Content from: {definition.dataSource}</span>
            )}
            {section.hasDraft && <span className="a-badge a-badge-warn">Unpublished draft</span>}
            <span className="flex-1" />
            <button
              type="button"
              className="a-btn a-btn-ghost a-btn-sm"
              onClick={() => {
                if (versions) {
                  setVersions(null);
                  return;
                }
                startTransition(async () => setVersions(await listSectionVersionsAction(section.id)));
              }}
            >
              <Icon name="clock" size={14} />
              {versions ? "Hide history" : "Version history"}
            </button>
          </div>

          {definition.dataSource && (
            <div className="mb-5">
              <Notice tone="info">
                The items shown by this section are managed in <strong>{definition.dataSource}</strong>.
                The fields below control its heading and layout.
              </Notice>
            </div>
          )}

          {versions && (
            <div className="mb-5 rounded-[var(--a-radius-sm)] border border-[var(--a-line)]">
              {versions.length === 0 ? (
                <p className="p-4 text-sm text-[var(--a-muted)]">
                  No previous versions yet. One is saved automatically before each publish.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--a-line)]">
                  {versions.map((version) => (
                    <li key={version.id} className="flex items-center justify-between gap-3 p-3">
                      <span className="min-w-0 text-sm">
                        <span className="block truncate">{version.label || "Snapshot"}</span>
                        <span className="text-[0.7rem] text-[var(--a-faint)]">
                          {formatDateTime(version.createdAt)} · {version.userName}
                        </span>
                      </span>
                      {canPublish && (
                        <ConfirmButton
                          label="Restore"
                          variant="outline"
                          confirmTitle="Restore this version?"
                          confirmBody="The current published content is snapshotted first, so this can be undone."
                          onConfirm={() => run(() => restoreVersionAction(version.id))}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <FieldsEditor
            fields={definition.fields}
            values={values}
            locales={locales}
            onChange={(next) => {
              setValues(next);
              setDirty(true);
            }}
          />

          {message && (
            <div className="mt-5">
              <Notice tone={message.ok ? "success" : "danger"}>{message.text}</Notice>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
