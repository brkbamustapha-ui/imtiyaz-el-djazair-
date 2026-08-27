export const LOCALES = ["en", "fr", "ar"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "ied_locale";

export const LOCALE_META: Record<
  Locale,
  { label: string; nativeLabel: string; dir: "ltr" | "rtl"; htmlLang: string }
> = {
  en: { label: "English", nativeLabel: "English", dir: "ltr", htmlLang: "en" },
  fr: { label: "French", nativeLabel: "Français", dir: "ltr", htmlLang: "fr" },
  ar: { label: "Arabic", nativeLabel: "العربية", dir: "rtl", htmlLang: "ar" },
};

/** A translatable string: `{ en, fr, ar }`. Missing locales fall back. */
export type LocalizedText = Partial<Record<Locale, string>>;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Resolve a localized value. Accepts a plain string too, so content authored
 * before a language was enabled keeps rendering.
 */
export function t(
  value: LocalizedText | string | null | undefined,
  locale: Locale = DEFAULT_LOCALE,
): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  const direct = value[locale];
  if (typeof direct === "string" && direct.trim() !== "") return direct;
  for (const fallback of [DEFAULT_LOCALE, ...LOCALES]) {
    const candidate = value[fallback];
    if (typeof candidate === "string" && candidate.trim() !== "") return candidate;
  }
  return "";
}

export function localized(text: string, locale: Locale = DEFAULT_LOCALE): LocalizedText {
  return { [locale]: text } as LocalizedText;
}

export function dirFor(locale: Locale): "ltr" | "rtl" {
  return LOCALE_META[locale].dir;
}
