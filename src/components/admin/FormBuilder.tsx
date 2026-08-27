"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteFormAction, saveFormAction } from "@/app/admin/actions/forms";
import { FIELD_TYPE_LABELS, FIELD_TYPES, type FormFieldDef, type FormFieldType } from "@/lib/forms";
import { LOCALE_META, t, type Locale, type LocalizedText } from "@/lib/i18n";
import { Icon } from "@/components/ui/Icon";
import { Card, ConfirmButton, Field, Notice, Spinner } from "./ui";
import { cn, slugify } from "@/lib/utils";

export function NewFormButton() {
  return (
    <Link href="/admin/forms/new" className="a-btn a-btn-primary">
      <Icon name="plus" size={15} />
      New form
    </Link>
  );
}

export type FormValues = {
  id: string | null;
  name: string;
  slug: string;
  successMessage: string;
  notifyEmail: string;
  isActive: boolean;
  fields: FormFieldDef[];
};

export function FormBuilder({
  initial,
  locales,
  canDelete,
}: {
  initial: FormValues;
  locales: Locale[];
  canDelete: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [openField, setOpenField] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const setField = (index: number, patch: Partial<FormFieldDef>) =>
    setValues((current) => ({
      ...current,
      fields: current.fields.map((field, position) =>
        position === index ? { ...field, ...patch } : field,
      ),
    }));

  const addField = () => {
    const id = `field_${Date.now().toString(36)}`;
    setValues((current) => ({
      ...current,
      fields: [
        ...current.fields,
        {
          id,
          name: id,
          label: { en: "New field" },
          type: "text",
          required: false,
          width: "full",
        },
      ],
    }));
    setOpenField(values.fields.length);
  };

  const save = () => {
    startTransition(async () => {
      const result = await saveFormAction(
        values.id,
        {
          name: values.name,
          slug: values.slug,
          successMessage: values.successMessage,
          notifyEmail: values.notifyEmail,
          isActive: values.isActive,
        },
        values.fields,
      );
      setMessage({ ok: result.ok, text: result.message });
      if (result.ok && result.id && !values.id) router.replace(`/admin/forms/${result.id}`);
      if (result.ok) router.refresh();
    });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <Card title="Fields" description="Drag to reorder. Every field is validated again on the server.">
        <ul className="space-y-2 p-4">
          {values.fields.map((field, index) => (
            <li
              key={field.id}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragIndex === null || dragIndex === index) return;
                const next = [...values.fields];
                const [moved] = next.splice(dragIndex, 1);
                next.splice(index, 0, moved);
                setDragIndex(null);
                setValues({ ...values, fields: next });
              }}
              onDragEnd={() => setDragIndex(null)}
              className={cn(
                "rounded-[var(--a-radius-sm)] border border-[var(--a-line)] bg-[var(--a-panel-2)]",
                dragIndex === index && "a-row-dragging",
              )}
            >
              <div className="flex items-center gap-2 p-2.5">
                <span className="a-drag-handle" aria-hidden>
                  <Icon name="drag" size={15} />
                </span>
                <button
                  type="button"
                  className="min-w-0 flex-1 text-start"
                  onClick={() => setOpenField(openField === index ? null : index)}
                >
                  <span className="block truncate text-[0.86rem] font-medium">
                    {t(field.label as LocalizedText, "en") || field.name}
                    {field.required && <span className="ms-1 text-[var(--a-danger)]">*</span>}
                  </span>
                  <span className="block truncate text-[0.7rem] text-[var(--a-faint)]">
                    {FIELD_TYPE_LABELS[field.type]} · {field.name}
                  </span>
                </button>
                <button
                  type="button"
                  className="a-btn a-btn-ghost a-btn-icon text-[var(--a-danger)]"
                  onClick={() =>
                    setValues({
                      ...values,
                      fields: values.fields.filter((_, position) => position !== index),
                    })
                  }
                  aria-label="Remove field"
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>

              {openField === index && (
                <div className="grid gap-3 border-t border-[var(--a-line)] p-3 sm:grid-cols-2">
                  <Field label="Label (English)" className="sm:col-span-2">
                    <input
                      className="a-input"
                      value={(field.label as LocalizedText).en ?? ""}
                      onChange={(event) =>
                        setField(index, {
                          label: { ...(field.label as LocalizedText), en: event.target.value },
                        })
                      }
                    />
                  </Field>

                  {locales
                    .filter((locale) => locale !== "en")
                    .map((locale) => (
                      <Field key={locale} label={`Label (${LOCALE_META[locale].label})`}>
                        <input
                          className="a-input"
                          dir={LOCALE_META[locale].dir}
                          value={(field.label as LocalizedText)[locale] ?? ""}
                          onChange={(event) =>
                            setField(index, {
                              label: { ...(field.label as LocalizedText), [locale]: event.target.value },
                            })
                          }
                        />
                      </Field>
                    ))}

                  <Field label="Type">
                    <select
                      className="a-select"
                      value={field.type}
                      onChange={(event) => setField(index, { type: event.target.value as FormFieldType })}
                    >
                      {FIELD_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {FIELD_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Field name" help="Letters, numbers and underscores. Used as the data key.">
                    <input
                      className="a-input a-mono"
                      value={field.name}
                      onChange={(event) =>
                        setField(index, { name: event.target.value.replace(/[^a-zA-Z0-9_]/g, "") })
                      }
                    />
                  </Field>

                  <Field label="Width">
                    <select
                      className="a-select"
                      value={field.width ?? "full"}
                      onChange={(event) => setField(index, { width: event.target.value as "full" | "half" })}
                    >
                      <option value="full">Full width</option>
                      <option value="half">Half width</option>
                    </select>
                  </Field>

                  <Field label="Placeholder">
                    <input
                      className="a-input"
                      value={field.placeholder ?? ""}
                      onChange={(event) => setField(index, { placeholder: event.target.value })}
                    />
                  </Field>

                  {(field.type === "select" || field.type === "radio") && (
                    <Field label="Options" help="One per line." className="sm:col-span-2">
                      <textarea
                        className="a-textarea"
                        rows={4}
                        value={(field.options ?? []).join("\n")}
                        onChange={(event) =>
                          setField(index, {
                            options: event.target.value.split("\n").map((line) => line.trim()).filter(Boolean),
                          })
                        }
                      />
                    </Field>
                  )}

                  <label className="flex items-center gap-2 text-sm sm:col-span-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[var(--a-brand)]"
                      checked={field.required}
                      onChange={(event) => setField(index, { required: event.target.checked })}
                    />
                    Required
                  </label>
                </div>
              )}
            </li>
          ))}
        </ul>

        <div className="border-t border-[var(--a-line)] p-4">
          <button type="button" className="a-btn a-btn-outline a-btn-sm" onClick={addField}>
            <Icon name="plus" size={14} />
            Add field
          </button>
        </div>
      </Card>

      <div className="space-y-5">
        <Card title="Form settings">
          <div className="space-y-4 p-5">
            <Field label="Name" htmlFor="form-name">
              <input
                id="form-name"
                className="a-input"
                value={values.name}
                onChange={(event) =>
                  setValues({
                    ...values,
                    name: event.target.value,
                    slug: values.id ? values.slug : slugify(event.target.value),
                  })
                }
              />
            </Field>
            <Field
              label="Slug"
              htmlFor="form-slug"
              help="Used by the contact section's “form to display” setting."
            >
              <input
                id="form-slug"
                className="a-input a-mono"
                value={values.slug}
                onChange={(event) => setValues({ ...values, slug: slugify(event.target.value) })}
              />
            </Field>
            <Field label="Thank-you message" htmlFor="form-success">
              <textarea
                id="form-success"
                className="a-textarea"
                rows={3}
                value={values.successMessage}
                onChange={(event) => setValues({ ...values, successMessage: event.target.value })}
              />
            </Field>
            <Field
              label="Notify this address"
              htmlFor="form-notify"
              help="Stored for reference. No mail transport is configured out of the box — messages always appear in this dashboard."
            >
              <input
                id="form-notify"
                className="a-input"
                value={values.notifyEmail}
                onChange={(event) => setValues({ ...values, notifyEmail: event.target.value })}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--a-brand)]"
                checked={values.isActive}
                onChange={(event) => setValues({ ...values, isActive: event.target.checked })}
              />
              Accepting submissions
            </label>

            {message && <Notice tone={message.ok ? "success" : "danger"}>{message.text}</Notice>}

            <div className="flex flex-wrap gap-2">
              <button type="button" className="a-btn a-btn-primary" onClick={save} disabled={pending}>
                {pending && <Spinner />}
                Save form
              </button>
              {canDelete && values.id && (
                <ConfirmButton
                  label="Delete form"
                  confirmTitle={`Delete “${values.name}”?`}
                  confirmBody="Every message received through this form is deleted with it."
                  onConfirm={async () => {
                    const result = await deleteFormAction(values.id!);
                    if (result.ok) router.push("/admin/forms");
                    else setMessage({ ok: false, text: result.message });
                  }}
                />
              )}
            </div>
          </div>
        </Card>

        <Card title="Spam protection">
          <ul className="space-y-2 p-5 text-[0.82rem] text-[var(--a-muted)]">
            {[
              "Hidden honeypot field",
              "Minimum fill time (2 seconds)",
              "Rate limit: 5 submissions per 10 minutes per visitor",
              "CSRF token checked on every submission",
              "Server-side validation of every field",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Icon name="check" size={14} className="mt-0.5 shrink-0 text-[var(--a-success)]" />
                {item}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
