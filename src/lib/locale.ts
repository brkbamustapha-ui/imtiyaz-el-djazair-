import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./i18n";
import { getSetting } from "./settings";

/** Active public-site language: cookie first, then the configured default. */
export const getLocale = cache(async function getLocale(): Promise<Locale> {
  const general = await getSetting("general");
  const enabled = general.enabledLocales.filter(isLocale);
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (fromCookie && isLocale(fromCookie) && enabled.includes(fromCookie)) {
    return fromCookie;
  }
  if (isLocale(general.defaultLocale) && enabled.includes(general.defaultLocale)) {
    return general.defaultLocale;
  }
  return enabled[0] ?? DEFAULT_LOCALE;
});

export const getEnabledLocales = cache(async function getEnabledLocales(): Promise<Locale[]> {
  const general = await getSetting("general");
  const enabled = general.enabledLocales.filter(isLocale);
  return enabled.length > 0 ? enabled : [DEFAULT_LOCALE];
});
