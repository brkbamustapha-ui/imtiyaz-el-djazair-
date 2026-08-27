"use client";

import { useState } from "react";
import { LOCALE_META, type Locale, type LocalizedText } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Compact single-line translatable input: one tab per enabled language.
 * A dot on a tab marks a language that has no text yet.
 */
export function LocalizedInput({
  value,
  onChange,
  locales,
  placeholder,
  ariaLabel,
  className,
}: {
  value: LocalizedText | string;
  onChange: (value: LocalizedText) => void;
  locales: Locale[];
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const [active, setActive] = useState<Locale>(locales[0] ?? "en");
  const current: LocalizedText = typeof value === "string" ? { en: value } : (value ?? {});

  return (
    <div className={cn("flex min-w-[150px] flex-1 items-center gap-1", className)}>
      <input
        className="a-input"
        dir={LOCALE_META[active].dir}
        placeholder={placeholder}
        aria-label={ariaLabel ? `${ariaLabel} (${LOCALE_META[active].label})` : undefined}
        value={current[active] ?? ""}
        onChange={(event) => onChange({ ...current, [active]: event.target.value })}
      />
      {locales.length > 1 && (
        <div className="flex shrink-0 gap-0.5 rounded-full border border-[var(--a-line)] p-0.5">
          {locales.map((locale) => (
            <button
              key={locale}
              type="button"
              onClick={() => setActive(locale)}
              title={LOCALE_META[locale].label}
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[0.62rem] font-bold uppercase transition-colors",
                active === locale
                  ? "bg-[var(--a-brand)] text-[#04121b]"
                  : "text-[var(--a-faint)] hover:text-[var(--a-text)]",
              )}
            >
              {locale}
              {current[locale]?.trim() ? "" : "·"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
