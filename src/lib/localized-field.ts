import { LOCALES, t, type Locale, type LocalizedText } from "./i18n";

/**
 * Collection text columns are plain strings in the database, but the CMS lets
 * the owner translate them. A translated value is stored as a JSON object
 * (`{"en":"…","fr":"…"}`); anything else is treated as a single-language
 * string. That keeps old rows and hand-edited data working unchanged.
 */
export function readLocalized(raw: string | null | undefined): LocalizedText | string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) return raw;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>;
      const keys = Object.keys(record);
      const looksLocalized =
        keys.length > 0 && keys.every((key) => (LOCALES as readonly string[]).includes(key));
      if (looksLocalized) {
        const result: LocalizedText = {};
        keys.forEach((key) => {
          const value = record[key];
          if (typeof value === "string") result[key as keyof LocalizedText] = value;
        });
        return result;
      }
    }
  } catch {
    // not JSON — fall through and treat it as plain text
  }
  return raw;
}

export function writeLocalized(value: LocalizedText | string): string {
  if (typeof value === "string") return value;
  const cleaned: LocalizedText = {};
  let filled = 0;
  (Object.keys(value) as (keyof LocalizedText)[]).forEach((key) => {
    const text = value[key];
    if (typeof text === "string" && text.trim() !== "") {
      cleaned[key] = text;
      filled += 1;
    }
  });
  if (filled === 0) return "";
  return JSON.stringify(cleaned);
}

/** Flattens a possibly-localized value for search, sorting and admin lists. */
export function plainText(raw: string | null | undefined): string {
  const value = readLocalized(raw);
  if (typeof value === "string") return value;
  for (const locale of LOCALES) {
    const text = value[locale];
    if (text) return text;
  }
  return "";
}

/**
 * Convenience for the public site: read a possibly-localized column and
 * resolve it for the active language in one call.
 */
export function lt(raw: string | null | undefined, locale: Locale): string {
  return t(readLocalized(raw), locale);
}
