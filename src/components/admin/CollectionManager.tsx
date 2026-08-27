"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteCollectionItemAction,
  reorderCollectionAction,
  saveCollectionItemAction,
  toggleCollectionItemAction,
} from "@/app/admin/actions/collections";
import type { CollectionDefinition } from "@/lib/collections";
import type { Locale } from "@/lib/i18n";
import type { CollectionRow } from "@/server/admin-collections";
import { FieldsEditor, type FieldValues } from "./FieldsEditor";
import { ConfirmButton, EmptyState, Modal, Notice, Spinner, Toggle } from "./ui";
import { Icon } from "@/components/ui/Icon";
import { cn, truncate } from "@/lib/utils";

function blankValues(definition: CollectionDefinition): FieldValues {
  const values: FieldValues = {};
  definition.fields.forEach((field) => {
    switch (field.type) {
      case "boolean":
        values[field.name] = field.name === "isActive";
        break;
      case "number":
        values[field.name] = field.min ?? 0;
        break;
      case "select":
        values[field.name] = field.options?.[0]?.value ?? "";
        break;
      case "localizedText":
      case "localizedTextarea":
        values[field.name] = {};
        break;
      default:
        values[field.name] = "";
    }
  });
  if ("rating" in values) values.rating = 5;
  if ("delayMs" in values) values.delayMs = 4000;
  if ("frequency" in values) values.frequency = "ONCE";
  return values;
}

export function CollectionManager({
  definition,
  rows,
  locales,
  readOnly = false,
  notice,
}: {
  definition: CollectionDefinition;
  rows: CollectionRow[];
  locales: Locale[];
  readOnly?: boolean;
  notice?: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState(rows);
  const [editing, setEditing] = useState<{ id: string | null; values: FieldValues } | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  if (rows !== items && rows.map((row) => row.id).join() !== items.map((row) => row.id).join()) {
    setItems(rows);
  }

  const run = (action: () => Promise<{ ok: boolean; message: string }>, onDone?: () => void) => {
    startTransition(async () => {
      const result = await action();
      setMessage({ ok: result.ok, text: result.message });
      if (result.ok) onDone?.();
      router.refresh();
    });
  };

  const commitOrder = (next: CollectionRow[]) => {
    setItems(next);
    run(() => reorderCollectionAction(definition.key, next.map((row) => row.id)));
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    commitOrder(next);
  };

  return (
    <>
      {notice && (
        <div className="mb-4">
          <Notice tone="warn">{notice}</Notice>
        </div>
      )}

      {message && (
        <div className="mb-4">
          <Notice tone={message.ok ? "success" : "danger"}>{message.text}</Notice>
        </div>
      )}

      <div className="a-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--a-line)] p-4">
          <p className="text-sm text-[var(--a-muted)]">
            {items.length} {items.length === 1 ? definition.singular.toLowerCase() : definition.label.toLowerCase()}
            {definition.orderable && items.length > 1 && " · drag to reorder"}
          </p>
          {!readOnly && (
            <button
              type="button"
              className="a-btn a-btn-primary a-btn-sm"
              onClick={() => setEditing({ id: null, values: blankValues(definition) })}
            >
              <Icon name="plus" size={14} />
              Add {definition.singular.toLowerCase()}
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={definition.icon}
            title={`No ${definition.label.toLowerCase()} yet`}
            description={definition.description}
            action={
              !readOnly ? (
                <button
                  type="button"
                  className="a-btn a-btn-primary a-btn-sm"
                  onClick={() => setEditing({ id: null, values: blankValues(definition) })}
                >
                  <Icon name="plus" size={14} />
                  Add the first one
                </button>
              ) : null
            }
          />
        ) : (
          <ul className="p-2">
            {items.map((row, index) => (
              <li
                key={row.id}
                draggable={definition.orderable && !readOnly}
                onDragStart={() => setDragIndex(index)}
                onDragOver={(event) => {
                  event.preventDefault();
                  setOverIndex(index);
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                onDrop={() => {
                  if (dragIndex === null || dragIndex === index) return;
                  const next = [...items];
                  const [moved] = next.splice(dragIndex, 1);
                  next.splice(index, 0, moved);
                  setDragIndex(null);
                  setOverIndex(null);
                  commitOrder(next);
                }}
                className={cn(
                  "mb-1.5 flex items-center gap-3 rounded-[var(--a-radius-sm)] border border-[var(--a-line)] bg-[var(--a-panel-2)] p-2.5 transition-all",
                  dragIndex === index && "a-row-dragging",
                  overIndex === index && dragIndex !== null && dragIndex !== index && "a-row-over",
                  !row.isActive && "opacity-55",
                )}
              >
                {definition.orderable && !readOnly && (
                  <span className="a-drag-handle hidden sm:block" aria-hidden>
                    <Icon name="drag" size={15} />
                  </span>
                )}

                {definition.imageField && (
                  <span className="flex h-11 w-14 shrink-0 items-center justify-center overflow-hidden rounded border border-[var(--a-line)] bg-[var(--a-panel)]">
                    {row.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.image} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <Icon name="image" size={15} className="text-[var(--a-faint)]" />
                    )}
                  </span>
                )}

                <button
                  type="button"
                  className="min-w-0 flex-1 text-start"
                  onClick={() => !readOnly && setEditing({ id: row.id, values: row.values })}
                  disabled={readOnly}
                >
                  <span className="block truncate text-[0.88rem] font-medium">{row.title}</span>
                  {row.subtitle && (
                    <span className="block truncate text-[0.75rem] text-[var(--a-muted)]">
                      {truncate(row.subtitle, 90)}
                    </span>
                  )}
                </button>

                {!readOnly && (
                  <div className="flex shrink-0 items-center gap-0.5">
                    {definition.orderable && (
                      <>
                        <button
                          type="button"
                          className="a-btn a-btn-ghost a-btn-icon hidden sm:inline-flex"
                          onClick={() => move(index, -1)}
                          disabled={index === 0 || pending}
                          aria-label="Move up"
                        >
                          <Icon name="chevronDown" size={14} className="rotate-180" />
                        </button>
                        <button
                          type="button"
                          className="a-btn a-btn-ghost a-btn-icon hidden sm:inline-flex"
                          onClick={() => move(index, 1)}
                          disabled={index === items.length - 1 || pending}
                          aria-label="Move down"
                        >
                          <Icon name="chevronDown" size={14} />
                        </button>
                      </>
                    )}
                    <Toggle
                      checked={row.isActive}
                      disabled={pending}
                      label={`Show ${row.title} on the website`}
                      onChange={(value) => run(() => toggleCollectionItemAction(definition.key, row.id, value))}
                    />
                    <button
                      type="button"
                      className="a-btn a-btn-ghost a-btn-icon"
                      onClick={() => setEditing({ id: row.id, values: row.values })}
                      aria-label={`Edit ${row.title}`}
                    >
                      <Icon name="edit" size={14} />
                    </button>
                    <ConfirmButton
                      label="Delete"
                      icon="trash"
                      iconOnly
                      confirmTitle={`Delete “${row.title}”?`}
                      confirmBody="This removes it from the website immediately and cannot be undone."
                      onConfirm={() => run(() => deleteCollectionItemAction(definition.key, row.id))}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <EditorModal
        definition={definition}
        editing={editing}
        locales={locales}
        pending={pending}
        onClose={() => setEditing(null)}
        onSave={(id, values) =>
          run(() => saveCollectionItemAction(definition.key, id, values), () => setEditing(null))
        }
      />
    </>
  );
}

function EditorModal({
  definition,
  editing,
  locales,
  pending,
  onClose,
  onSave,
}: {
  definition: CollectionDefinition;
  editing: { id: string | null; values: FieldValues } | null;
  locales: Locale[];
  pending: boolean;
  onClose: () => void;
  onSave: (id: string | null, values: FieldValues) => void;
}) {
  const [values, setValues] = useState<FieldValues>({});
  const [key, setKey] = useState<string>("");

  // Reset the form whenever a different row is opened.
  const currentKey = editing ? `${editing.id ?? "new"}` : "";
  if (currentKey !== key) {
    setKey(currentKey);
    setValues(editing?.values ?? {});
  }

  if (!editing) return null;

  return (
    <Modal
      open
      onClose={onClose}
      title={editing.id ? `Edit ${definition.singular.toLowerCase()}` : `New ${definition.singular.toLowerCase()}`}
      size="lg"
      footer={
        <>
          <button type="button" className="a-btn a-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="a-btn a-btn-primary"
            disabled={pending}
            onClick={() => onSave(editing.id, values)}
          >
            {pending && <Spinner />}
            Save
          </button>
        </>
      }
    >
      <FieldsEditor fields={definition.fields} values={values} onChange={setValues} locales={locales} />
    </Modal>
  );
}
