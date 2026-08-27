"use client";

import type { Locale } from "@/lib/i18n";
import { Notice } from "./ui";
import { cn } from "@/lib/utils";

export function LanguagePicker({
  all,
  meta,
  enabled,
  defaultLocale,
  onChange,
}: {
  all: Locale[];
  meta: Record<Locale, { label: string; nativeLabel: string; dir: string }>;
  enabled: string[];
  defaultLocale: string;
  onChange: (enabled: string[], defaultLocale: string) => void;
}) {
  const toggle = (locale: Locale) => {
    const next = enabled.includes(locale)
      ? enabled.filter((entry) => entry !== locale)
      : [...enabled, locale];
    if (next.length === 0) return; // at least one language must stay on
    onChange(next, next.includes(defaultLocale) ? defaultLocale : next[0]);
  };

  return (
    <fieldset className="space-y-3">
      <legend className="a-section-title mb-2 w-full border-b border-[var(--a-line)] pb-2">
        Languages
      </legend>

      <div className="grid gap-2 sm:grid-cols-3">
        {all.map((locale) => {
          const isOn = enabled.includes(locale);
          return (
            <button
              key={locale}
              type="button"
              onClick={() => toggle(locale)}
              className={cn(
                "rounded-[var(--a-radius-sm)] border p-3 text-start transition-colors",
                isOn ? "border-[var(--a-brand)] bg-[var(--a-brand-soft)]" : "border-[var(--a-line)]",
              )}
            >
              <span className="block text-[0.86rem] font-semibold">{meta[locale].nativeLabel}</span>
              <span className="block text-[0.72rem] text-[var(--a-muted)]">
                {meta[locale].label} · {locale}
                {meta[locale].dir === "rtl" ? " · right-to-left" : ""}
              </span>
            </button>
          );
        })}
      </div>

      <label className="block">
        <span className="a-label">Default language</span>
        <select
          className="a-select"
          value={defaultLocale}
          onChange={(event) => onChange(enabled, event.target.value)}
        >
          {enabled.map((locale) => (
            <option key={locale} value={locale}>
              {meta[locale as Locale]?.nativeLabel ?? locale}
            </option>
          ))}
        </select>
      </label>

      <Notice tone="info">
        Visitors pick a language from the switcher in the header; their choice is remembered in a
        cookie. Translate each field using the language tabs on the text boxes — a dot marks a
        language with no text yet, which falls back to the default.
      </Notice>
    </fieldset>
  );
}
