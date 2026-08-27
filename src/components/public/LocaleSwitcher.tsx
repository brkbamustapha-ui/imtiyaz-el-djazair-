"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, LOCALE_META, type Locale } from "@/lib/i18n";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

/**
 * Language is stored in a cookie and read on the server, so the whole page
 * (including CMS content) renders in the chosen language without duplicating
 * every route behind a /[locale] segment.
 */
export function LocaleSwitcher({
  locales,
  current,
  className,
}: {
  locales: Locale[];
  current: Locale;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (locales.length < 2) return null;

  const choose = (locale: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    setOpen(false);
    startTransition(() => router.refresh());
  };

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="btn btn-ghost btn-sm gap-1.5 !px-2.5 text-[var(--c-muted)] hover:text-[var(--c-text)]"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Change language"
        disabled={pending}
      >
        <Icon name="globe" size={16} />
        <span className="text-xs font-semibold uppercase">{current}</span>
        <Icon name="chevronDown" size={13} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <ul
            role="listbox"
            className="card absolute end-0 top-[calc(100%+8px)] z-50 min-w-[168px] overflow-hidden p-1.5"
            style={{ background: "var(--c-surface-2)" }}
          >
            {locales.map((locale) => (
              <li key={locale}>
                <button
                  type="button"
                  role="option"
                  aria-selected={locale === current}
                  onClick={() => choose(locale)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-sm transition-colors",
                    locale === current
                      ? "bg-[rgb(var(--c-primary-rgb)/0.14)] text-[var(--c-text)]"
                      : "text-[var(--c-muted)] hover:bg-[rgb(var(--c-text-rgb)/0.05)] hover:text-[var(--c-text)]",
                  )}
                >
                  <span>{LOCALE_META[locale].nativeLabel}</span>
                  {locale === current && <Icon name="check" size={14} />}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
