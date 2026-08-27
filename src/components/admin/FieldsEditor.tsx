"use client";

import { useId, useState } from "react";
import type { Field } from "@/lib/section-types";
import { LOCALE_META, type Locale, type LocalizedText } from "@/lib/i18n";
import { Icon } from "@/components/ui/Icon";
import { MediaField } from "./MediaPicker";
import { Field as FieldWrap } from "./ui";
import { cn } from "@/lib/utils";

export type FieldValues = Record<string, unknown>;

/**
 * Renders an editor form from a field schema. Used by both the Website Builder
 * (section blocks) and every content collection, so all editors stay
 * consistent and adding a field never requires new UI code.
 */
export function FieldsEditor({
  fields,
  values,
  onChange,
  locales,
}: {
  fields: Field[];
  values: FieldValues;
  onChange: (next: FieldValues) => void;
  locales: Locale[];
}) {
  const set = (name: string, value: unknown) => onChange({ ...values, [name]: value });

  const visible = fields.filter((field) => {
    if (!field.showWhen) return true;
    return values[field.showWhen.field] === field.showWhen.equals;
  });

  const groups = new Map<string, Field[]>();
  visible.forEach((field) => {
    const key = field.group ?? "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(field);
  });

  return (
    <div className="space-y-6">
      {Array.from(groups.entries()).map(([group, groupFields]) => (
        <fieldset key={group || "default"} className="space-y-4">
          {group && (
            <legend className="a-section-title mb-1 w-full border-b border-[var(--a-line)] pb-2">
              {group}
            </legend>
          )}
          {groupFields.map((field) => (
            <FieldControl
              key={field.name}
              field={field}
              value={values[field.name]}
              onChange={(value) => set(field.name, value)}
              locales={locales}
            />
          ))}
        </fieldset>
      ))}
    </div>
  );
}

function FieldControl({
  field,
  value,
  onChange,
  locales,
}: {
  field: Field;
  value: unknown;
  onChange: (value: unknown) => void;
  locales: Locale[];
}) {
  const id = useId();

  switch (field.type) {
    case "boolean":
      return (
        <label className="flex cursor-pointer items-start gap-3 rounded-[var(--a-radius-sm)] border border-[var(--a-line)] p-3">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-[var(--a-brand)]"
            checked={Boolean(value)}
            onChange={(event) => onChange(event.target.checked)}
          />
          <span>
            <span className="block text-[0.85rem] font-medium">{field.label}</span>
            {field.help && <span className="a-help">{field.help}</span>}
          </span>
        </label>
      );

    case "number":
      return (
        <FieldWrap label={field.label} htmlFor={id} help={field.help}>
          <input
            id={id}
            type="number"
            className="a-input"
            value={value === undefined || value === null ? "" : String(value)}
            min={field.min}
            max={field.max}
            step={field.step ?? 1}
            onChange={(event) => onChange(event.target.value === "" ? 0 : Number(event.target.value))}
          />
        </FieldWrap>
      );

    case "select":
      return (
        <FieldWrap label={field.label} htmlFor={id} help={field.help}>
          <select
            id={id}
            className="a-select"
            value={String(value ?? field.options?.[0]?.value ?? "")}
            onChange={(event) => onChange(event.target.value)}
          >
            {(field.options ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FieldWrap>
      );

    case "color":
      return (
        <FieldWrap label={field.label} htmlFor={id} help={field.help}>
          <div className="flex items-center gap-2">
            <input
              id={id}
              type="color"
              className="h-9 w-12 cursor-pointer rounded border border-[var(--a-line)] bg-transparent"
              value={/^#[0-9a-f]{6}$/i.test(String(value ?? "")) ? String(value) : "#000000"}
              onChange={(event) => onChange(event.target.value)}
            />
            <input
              className="a-input a-mono"
              value={String(value ?? "")}
              onChange={(event) => onChange(event.target.value)}
              placeholder="#000000"
            />
          </div>
        </FieldWrap>
      );

    case "image":
    case "video":
      return (
        <FieldWrap label={field.label} help={field.help}>
          <MediaField
            value={String(value ?? "")}
            onChange={onChange}
            kind={field.type === "video" ? "video" : "image"}
            label={field.label}
          />
        </FieldWrap>
      );

    case "textarea":
      return (
        <FieldWrap label={field.label} htmlFor={id} help={field.help}>
          <textarea
            id={id}
            className="a-textarea"
            value={String(value ?? "")}
            placeholder={field.placeholder}
            onChange={(event) => onChange(event.target.value)}
          />
        </FieldWrap>
      );

    case "localizedText":
    case "localizedTextarea":
    case "localizedRichText":
      return (
        <LocalizedInput
          field={field}
          value={(value ?? {}) as LocalizedText}
          onChange={onChange}
          locales={locales}
        />
      );

    case "repeater":
      return <RepeaterField field={field} value={value} onChange={onChange} locales={locales} />;

    case "link":
    default:
      return (
        <FieldWrap label={field.label} htmlFor={id} help={field.help}>
          <input
            id={id}
            className="a-input"
            value={String(value ?? "")}
            placeholder={field.placeholder ?? (field.type === "link" ? "/contact" : undefined)}
            onChange={(event) => onChange(event.target.value)}
          />
        </FieldWrap>
      );
  }
}

/** One tab per enabled language, so a field can be translated in place. */
function LocalizedInput({
  field,
  value,
  onChange,
  locales,
}: {
  field: Field;
  value: LocalizedText;
  onChange: (value: LocalizedText) => void;
  locales: Locale[];
}) {
  const [active, setActive] = useState<Locale>(locales[0] ?? "en");
  const id = useId();
  const current = typeof value === "string" ? { en: value } : (value ?? {});
  const isLong = field.type !== "localizedText";
  const isRich = field.type === "localizedRichText";

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <label className="a-label !mb-0" htmlFor={`${id}-${active}`}>
          {field.label}
        </label>
        {locales.length > 1 && (
          <div className="flex gap-0.5 rounded-full border border-[var(--a-line)] p-0.5">
            {locales.map((locale) => (
              <button
                key={locale}
                type="button"
                onClick={() => setActive(locale)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[0.68rem] font-semibold uppercase transition-colors",
                  active === locale
                    ? "bg-[var(--a-brand)] text-[#04121b]"
                    : "text-[var(--a-faint)] hover:text-[var(--a-text)]",
                )}
                title={LOCALE_META[locale].label}
              >
                {locale}
                {current[locale]?.trim() ? "" : " •"}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLong ? (
        <textarea
          id={`${id}-${active}`}
          className="a-textarea"
          rows={isRich ? 8 : 4}
          dir={LOCALE_META[active].dir}
          placeholder={field.placeholder}
          value={current[active] ?? ""}
          onChange={(event) => onChange({ ...current, [active]: event.target.value })}
        />
      ) : (
        <input
          id={`${id}-${active}`}
          className="a-input"
          dir={LOCALE_META[active].dir}
          placeholder={field.placeholder}
          value={current[active] ?? ""}
          onChange={(event) => onChange({ ...current, [active]: event.target.value })}
        />
      )}

      <p className="a-help">
        {isRich && "Basic HTML is allowed (<p>, <h2>, <ul>, <strong>, <a>). Scripts are removed. "}
        {field.help}
        {locales.length > 1 && " A dot marks a language that has no text yet — it falls back to English."}
      </p>
    </div>
  );
}

function RepeaterField({
  field,
  value,
  onChange,
  locales,
}: {
  field: Field;
  value: unknown;
  onChange: (value: unknown) => void;
  locales: Locale[];
}) {
  const rows = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
  const max = field.max ?? 40;
  const [openIndex, setOpenIndex] = useState<number | null>(rows.length === 1 ? 0 : null);

  const update = (index: number, next: Record<string, unknown>) => {
    const copy = [...rows];
    copy[index] = next;
    onChange(copy);
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const copy = [...rows];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    onChange(copy);
    setOpenIndex(target);
  };

  const rowLabel = (row: Record<string, unknown>, index: number) => {
    const source = field.itemLabelField ? row[field.itemLabelField] : undefined;
    if (typeof source === "string" && source.trim()) return source;
    if (source && typeof source === "object") {
      const first = Object.values(source as Record<string, string>).find((entry) => entry?.trim());
      if (first) return first;
    }
    return `Item ${index + 1}`;
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="a-label !mb-0">{field.label}</span>
        <span className="text-[0.7rem] text-[var(--a-faint)]">
          {rows.length} / {max}
        </span>
      </div>

      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={index} className="rounded-[var(--a-radius-sm)] border border-[var(--a-line)]">
            <div className="flex items-center gap-1 p-2">
              <button
                type="button"
                className="a-btn a-btn-ghost a-btn-sm flex-1 !justify-start truncate"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                aria-expanded={openIndex === index}
              >
                <Icon
                  name="chevronRight"
                  size={13}
                  className={cn("transition-transform", openIndex === index && "rotate-90")}
                />
                <span className="truncate">{rowLabel(row, index)}</span>
              </button>
              {rows.length > 1 && (
                <>
                  <button
                    type="button"
                    className="a-btn a-btn-ghost a-btn-icon"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label="Move up"
                  >
                    <Icon name="chevronDown" size={14} className="rotate-180" />
                  </button>
                  <button
                    type="button"
                    className="a-btn a-btn-ghost a-btn-icon"
                    onClick={() => move(index, 1)}
                    disabled={index === rows.length - 1}
                    aria-label="Move down"
                  >
                    <Icon name="chevronDown" size={14} />
                  </button>
                </>
              )}
              <button
                type="button"
                className="a-btn a-btn-ghost a-btn-icon text-[var(--a-danger)]"
                onClick={() => {
                  onChange(rows.filter((_, position) => position !== index));
                  setOpenIndex(null);
                }}
                aria-label="Remove"
              >
                <Icon name="trash" size={14} />
              </button>
            </div>

            {openIndex === index && (
              <div className="space-y-4 border-t border-[var(--a-line)] p-3">
                {(field.fields ?? []).map((sub) => (
                  <FieldControl
                    key={sub.name}
                    field={sub}
                    value={row[sub.name]}
                    onChange={(next) => update(index, { ...row, [sub.name]: next })}
                    locales={locales}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {rows.length < max && (
        <button
          type="button"
          className="a-btn a-btn-outline a-btn-sm mt-2"
          onClick={() => {
            const blank: Record<string, unknown> = {};
            (field.fields ?? []).forEach((sub) => {
              blank[sub.name] = sub.type === "boolean" ? false : sub.type === "number" ? 0 : sub.type === "repeater" ? [] : sub.type.startsWith("localized") ? {} : "";
            });
            onChange([...rows, blank]);
            setOpenIndex(rows.length);
          }}
        >
          <Icon name="plus" size={14} />
          {field.addLabel ?? "Add"}
        </button>
      )}
      {field.help && <p className="a-help">{field.help}</p>}
    </div>
  );
}
