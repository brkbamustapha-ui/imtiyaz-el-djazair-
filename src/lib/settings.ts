import { cache } from "react";
import { db } from "./db";
import { parseJson, stringifyJson } from "./json";
import {
  DEFAULT_SETTINGS,
  type SettingsKey,
  type SettingsMap,
} from "./settings-schema";

/** Shallow-merge stored values over defaults so new fields never break old rows. */
function merge<K extends SettingsKey>(key: K, stored: unknown): SettingsMap[K] {
  const base = DEFAULT_SETTINGS[key];
  if (!stored || typeof stored !== "object") return base;
  return { ...base, ...(stored as object) } as SettingsMap[K];
}

/** Cached per request so a page render hits the DB once per settings bucket. */
export const getSetting = cache(async function getSetting<K extends SettingsKey>(
  key: K,
): Promise<SettingsMap[K]> {
  try {
    const row = await db.siteSetting.findUnique({ where: { key } });
    return merge(key, parseJson<unknown>(row?.valueJson, null));
  } catch {
    // Database not reachable yet (e.g. first boot before `db push`).
    return DEFAULT_SETTINGS[key];
  }
});

export const getAllSettings = cache(async function getAllSettings(): Promise<SettingsMap> {
  try {
    const rows = await db.siteSetting.findMany();
    const map = new Map(rows.map((row) => [row.key, row.valueJson]));
    const result = {} as SettingsMap;
    (Object.keys(DEFAULT_SETTINGS) as SettingsKey[]).forEach((key) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (result as any)[key] = merge(key, parseJson<unknown>(map.get(key), null));
    });
    return result;
  } catch {
    return DEFAULT_SETTINGS;
  }
});

export async function saveSetting<K extends SettingsKey>(
  key: K,
  value: SettingsMap[K],
): Promise<void> {
  const valueJson = stringifyJson(value);
  await db.siteSetting.upsert({
    where: { key },
    create: { key, valueJson },
    update: { valueJson },
  });
}

export { DEFAULT_SETTINGS };
export type { SettingsMap, SettingsKey };
