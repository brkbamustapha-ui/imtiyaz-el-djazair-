"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { getSetting, saveSetting } from "@/lib/settings";
import { DEFAULT_SETTINGS, THEME_PRESETS, type SettingsKey } from "@/lib/settings-schema";
import { LOCALES, isLocale } from "@/lib/i18n";
import { fail, ok, sanitiseAssetPath, type ActionResult } from "./_helpers";
import { safeHref } from "@/lib/utils";
import type { Permission } from "@/lib/permissions";

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

const PERMISSION_BY_KEY: Record<SettingsKey, Permission> = {
  general: "settings.manage",
  contact: "seo.manage",
  social: "seo.manage",
  appearance: "appearance.manage",
  seo: "seo.manage",
  advanced: "advanced.manage",
  footer: "navigation.manage",
};

function refresh() {
  revalidatePath("/", "layout");
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function colorOr(value: unknown, fallback: string): string {
  const text = String(value ?? "").trim();
  return HEX.test(text) ? text : fallback;
}

function text(value: unknown, max = 400): string {
  return String(value ?? "").slice(0, max);
}

function localizedObject(value: unknown, max = 2000): Record<string, string> {
  if (typeof value === "string") return { en: value.slice(0, max) };
  if (!value || typeof value !== "object") return {};
  const record = value as Record<string, unknown>;
  const result: Record<string, string> = {};
  LOCALES.forEach((locale) => {
    const entry = record[locale];
    if (typeof entry === "string" && entry.trim() !== "") result[locale] = entry.slice(0, max);
  });
  return result;
}

/**
 * Each settings bucket has its own sanitiser. Nothing is written straight from
 * the request body — colours must be hex, links must be safe, numbers clamped.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitise(key: SettingsKey, input: Record<string, unknown>, current: any): any {
  switch (key) {
    case "general":
      return {
        ...current,
        siteName: text(input.siteName, 80) || DEFAULT_SETTINGS.general.siteName,
        tagline: localizedObject(input.tagline, 160),
        shortDescription: localizedObject(input.shortDescription, 400),
        logoUrl: sanitiseAssetPath(text(input.logoUrl, 600)),
        logoDarkUrl: sanitiseAssetPath(text(input.logoDarkUrl, 600)),
        faviconUrl: sanitiseAssetPath(text(input.faviconUrl, 600)),
        ogImageUrl: sanitiseAssetPath(text(input.ogImageUrl, 600)),
        navCtaLabel: localizedObject(input.navCtaLabel, 40),
        navCtaHref: safeHref(text(input.navCtaHref, 400)),
        enabledLocales: (Array.isArray(input.enabledLocales) ? input.enabledLocales : ["en"])
          .map(String)
          .filter(isLocale)
          .slice(0, LOCALES.length),
        defaultLocale: isLocale(String(input.defaultLocale)) ? String(input.defaultLocale) : "en",
        demoContentNotice: Boolean(input.demoContentNotice),
      };

    case "contact":
      return {
        ...current,
        addressLine1: text(input.addressLine1, 160),
        addressLine2: text(input.addressLine2, 160),
        city: text(input.city, 80),
        country: text(input.country, 80),
        phonePrimary: text(input.phonePrimary, 40),
        phoneSecondary: text(input.phoneSecondary, 40),
        email: text(input.email, 160),
        admissionsEmail: text(input.admissionsEmail, 160),
        mapEmbedUrl: /^https:\/\//i.test(text(input.mapEmbedUrl, 800)) ? text(input.mapEmbedUrl, 800) : "",
        mapsLink: safeHref(text(input.mapsLink, 600)) === "#" ? "" : text(input.mapsLink, 600),
        openingHours: (Array.isArray(input.openingHours) ? input.openingHours : [])
          .slice(0, 10)
          .map((row) => {
            const entry = (row ?? {}) as Record<string, unknown>;
            return { day: localizedObject(entry.day, 80), hours: text(entry.hours, 60) };
          }),
      };

    case "social": {
      const result: Record<string, string> = {};
      Object.keys(DEFAULT_SETTINGS.social).forEach((field) => {
        const value = text(input[field], 400).trim();
        result[field] = value === "" ? "" : safeHref(value) === "#" ? "" : value;
      });
      return result;
    }

    case "appearance": {
      const presetKey = String(input.preset ?? "luxury-gold");
      const preset = THEME_PRESETS[presetKey] ?? THEME_PRESETS["luxury-gold"];
      const incoming = (input.colors ?? {}) as Record<string, unknown>;
      const colors = Object.fromEntries(
        (Object.keys(DEFAULT_SETTINGS.appearance.colors) as (keyof typeof preset.colors)[]).map(
          (field) => [field, colorOr(incoming[field], preset.colors[field])],
        ),
      );
      return {
        preset: THEME_PRESETS[presetKey] ? presetKey : "custom",
        colors,
        fontHeading: text(input.fontHeading, 60) || "Sora",
        fontBody: text(input.fontBody, 60) || "Inter",
        headingScale: clampNumber(input.headingScale, 0.75, 1.5, 1),
        radius: clampNumber(input.radius, 0, 48, 18),
        shadowStrength: clampNumber(input.shadowStrength, 0, 1, 0.5),
        glassOpacity: clampNumber(input.glassOpacity, 0, 0.4, 0.06),
        buttonStyle: ["pill", "rounded", "square"].includes(String(input.buttonStyle))
          ? String(input.buttonStyle)
          : "pill",
        animationsEnabled: Boolean(input.animationsEnabled),
        animationSpeed: clampNumber(input.animationSpeed, 0.25, 2, 1),
        effects3dEnabled: Boolean(input.effects3dEnabled),
        effects3dIntensity: clampNumber(input.effects3dIntensity, 0, 1, 0.75),
        grain: Boolean(input.grain),
      };
    }

    case "seo":
      return {
        ...current,
        defaultTitle: text(input.defaultTitle, 160),
        titleTemplate: text(input.titleTemplate, 120),
        defaultDescription: text(input.defaultDescription, 400),
        keywords: (Array.isArray(input.keywords)
          ? input.keywords
          : String(input.keywords ?? "").split(",")
        )
          .map((value) => String(value).trim())
          .filter(Boolean)
          .slice(0, 25),
        twitterHandle: text(input.twitterHandle, 40),
        googleSiteVerification: text(input.googleSiteVerification, 200),
        robotsIndex: Boolean(input.robotsIndex),
        organizationType: text(input.organizationType, 60) || "EducationalOrganization",
      };

    case "advanced":
      return {
        ...current,
        // `</style` / `</script` are stripped so the block cannot be escaped.
        customCss: text(input.customCss, 40_000).replace(/<\/?(style|script)/gi, ""),
        headScripts: text(input.headScripts, 20_000),
        bodyEndScripts: text(input.bodyEndScripts, 20_000),
        maintenanceMode: Boolean(input.maintenanceMode),
        maintenanceMessage: localizedObject(input.maintenanceMessage, 400),
      };

    case "footer":
      return {
        ...current,
        about: localizedObject(input.about, 600),
        showPartners: Boolean(input.showPartners),
        copyright: localizedObject(input.copyright, 200),
        columns: (Array.isArray(input.columns) ? input.columns : []).slice(0, 6).map((row, index) => {
          const column = (row ?? {}) as Record<string, unknown>;
          return {
            id: text(column.id, 40) || `column-${index}`,
            title: localizedObject(column.title, 80),
            links: (Array.isArray(column.links) ? column.links : []).slice(0, 12).map((linkRow, linkIndex) => {
              const link = (linkRow ?? {}) as Record<string, unknown>;
              return {
                id: text(link.id, 40) || `link-${linkIndex}`,
                label: localizedObject(link.label, 80),
                href: safeHref(text(link.href, 400)),
              };
            }),
          };
        }),
        bottomLinks: (Array.isArray(input.bottomLinks) ? input.bottomLinks : []).slice(0, 8).map((row, index) => {
          const link = (row ?? {}) as Record<string, unknown>;
          return {
            id: text(link.id, 40) || `bottom-${index}`,
            label: localizedObject(link.label, 80),
            href: safeHref(text(link.href, 400)),
          };
        }),
      };

    default:
      return current;
  }
}

export async function saveSettingsAction(
  key: string,
  input: Record<string, unknown>,
): Promise<ActionResult> {
  if (!(key in DEFAULT_SETTINGS)) return fail("Unknown settings section.");
  const settingsKey = key as SettingsKey;

  const user = await requirePermission(PERMISSION_BY_KEY[settingsKey]).catch(() => null);
  if (!user) return fail("You do not have permission to change these settings.");

  // Custom scripts additionally require the server-side switch.
  if (settingsKey === "advanced" && process.env.ALLOW_CUSTOM_SCRIPTS !== "true") {
    const hasScripts =
      String(input.headScripts ?? "").trim() !== "" || String(input.bodyEndScripts ?? "").trim() !== "";
    if (hasScripts) {
      return fail(
        "Custom scripts are disabled. Set ALLOW_CUSTOM_SCRIPTS=true in the server environment first.",
      );
    }
  }

  const current = await getSetting(settingsKey);
  const clean = sanitise(settingsKey, input, current);
  await saveSetting(settingsKey, clean);

  await logAdminAction({ userId: user.id, action: "settings.updated", entityType: "settings", entityId: key });
  refresh();
  return ok("Settings saved.");
}

export async function resetSettingsAction(key: string): Promise<ActionResult> {
  if (!(key in DEFAULT_SETTINGS)) return fail("Unknown settings section.");
  const settingsKey = key as SettingsKey;
  const user = await requirePermission(PERMISSION_BY_KEY[settingsKey]).catch(() => null);
  if (!user) return fail("Not allowed.");

  await db.siteSetting.upsert({
    where: { key },
    create: { key, valueJson: JSON.stringify(DEFAULT_SETTINGS[settingsKey]) },
    update: { valueJson: JSON.stringify(DEFAULT_SETTINGS[settingsKey]) },
  });
  await logAdminAction({ userId: user.id, action: "settings.reset", entityType: "settings", entityId: key });
  refresh();
  return ok("Reset to the original values.");
}
