import "server-only";
import { requirePermission } from "@/lib/auth";
import type { Permission } from "@/lib/permissions";
import type { Field } from "@/lib/section-types";
import { writeLocalized } from "@/lib/localized-field";
import { LOCALES, type LocalizedText } from "@/lib/i18n";
import { safeHref } from "@/lib/utils";
import { stringifyJson } from "@/lib/json";

export type ActionResult = { ok: boolean; message: string; id?: string };

export function ok(message: string, id?: string): ActionResult {
  return { ok: true, message, id };
}

export function fail(message: string): ActionResult {
  return { ok: false, message };
}

/** Wraps an action so a thrown permission error becomes a form message. */
export async function withPermission<T>(
  permission: Permission,
  run: () => Promise<T>,
): Promise<T | ActionResult> {
  try {
    await requirePermission(permission);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Not allowed.");
  }
  return run();
}

const MAX_TEXT = 8000;
const MAX_SHORT = 400;

/**
 * Coerces one submitted value according to its field definition.
 * Everything that reaches the database goes through here — the browser form is
 * never trusted to have produced the right shape.
 */
export function coerceField(field: Field, raw: unknown): unknown {
  switch (field.type) {
    case "boolean":
      return raw === true || raw === "true" || raw === "on" || raw === "1";
    case "number": {
      const value = Number(raw);
      if (!Number.isFinite(value)) return field.min ?? 0;
      const min = field.min ?? Number.MIN_SAFE_INTEGER;
      const max = field.max ?? Number.MAX_SAFE_INTEGER;
      return Math.min(max, Math.max(min, value));
    }
    case "select": {
      const value = String(raw ?? "");
      const allowed = (field.options ?? []).map((option) => option.value);
      if (allowed.length === 0) return value.slice(0, MAX_SHORT);
      return allowed.includes(value) ? value : allowed[0];
    }
    case "link":
      return safeHref(String(raw ?? "")).slice(0, 600);
    case "image":
    case "video":
      return sanitiseAssetPath(String(raw ?? ""));
    case "color": {
      const value = String(raw ?? "").trim();
      return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : "";
    }
    case "localizedText":
    case "localizedTextarea":
    case "localizedRichText":
      return coerceLocalized(raw, field.type === "localizedText" ? MAX_SHORT * 2 : MAX_TEXT);
    case "repeater": {
      if (!Array.isArray(raw)) return [];
      return raw.slice(0, field.max ?? 50).map((row) => {
        const record = (row ?? {}) as Record<string, unknown>;
        const result: Record<string, unknown> = {};
        (field.fields ?? []).forEach((sub) => {
          result[sub.name] = coerceField(sub, record[sub.name]);
        });
        return result;
      });
    }
    case "textarea":
      return String(raw ?? "").slice(0, MAX_TEXT);
    default:
      return String(raw ?? "").slice(0, MAX_SHORT * 2);
  }
}

function coerceLocalized(raw: unknown, maxLength: number): LocalizedText {
  if (typeof raw === "string") {
    return { en: raw.slice(0, maxLength) };
  }
  if (!raw || typeof raw !== "object") return {};
  const record = raw as Record<string, unknown>;
  const result: LocalizedText = {};
  LOCALES.forEach((locale) => {
    const value = record[locale];
    if (typeof value === "string" && value.trim() !== "") {
      result[locale] = value.slice(0, maxLength);
    }
  });
  return result;
}

/** Only same-origin asset paths or https URLs may be stored as media. */
export function sanitiseAssetPath(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "") return "";
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed.slice(0, 600);
  if (/^https:\/\//i.test(trimmed)) return trimmed.slice(0, 600);
  return "";
}

/** Localized fields on collection rows are stored as a JSON string column. */
export function coerceForColumn(field: Field, raw: unknown): string | number | boolean {
  const value = coerceField(field, raw);
  if (field.type === "localizedText" || field.type === "localizedTextarea") {
    return writeLocalized(value as LocalizedText);
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  // A repeater yields rows, and these columns are TEXT. Falling through to
  // String() here would have written "[object Object]" into the database.
  if (value !== null && typeof value === "object") return stringifyJson(value);
  return String(value ?? "");
}
