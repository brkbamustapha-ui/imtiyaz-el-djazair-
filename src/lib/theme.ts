import type { AppearanceSettings } from "./settings-schema";

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function safeColor(value: string, fallback: string): string {
  return HEX.test(value?.trim() ?? "") ? value.trim() : fallback;
}

function hexToRgb(hex: string): [number, number, number] {
  let value = hex.replace("#", "");
  if (value.length === 3) {
    value = value
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const int = Number.parseInt(value, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Pick black or white text for a background so contrast stays readable. */
export function contrastText(hex: string): string {
  return relativeLuminance(safeColor(hex, "#000000")) > 0.45 ? "#0b1220" : "#ffffff";
}

export function isLightTheme(appearance: AppearanceSettings): boolean {
  return relativeLuminance(safeColor(appearance.colors.background, "#000000")) > 0.5;
}

/**
 * Serialise the appearance settings into CSS custom properties. Rendered into a
 * <style> tag in the root layout so a theme change in /admin is live everywhere
 * with no rebuild.
 */
export function appearanceToCssVars(appearance: AppearanceSettings): string {
  const c = appearance.colors;
  const fallback = {
    background: "#233d74",
    surface: "#2a4784",
    surfaceElevated: "#325091",
    text: "#ffffff",
    textMuted: "#b7c6e8",
    primary: "#17aee0",
    primaryDark: "#1a2e57",
    accent: "#00e68c",
    accentSoft: "#7df3c5",
    border: "#3b5896",
  };

  const entries: Record<string, string> = {
    "--c-bg": safeColor(c.background, fallback.background),
    "--c-surface": safeColor(c.surface, fallback.surface),
    "--c-surface-2": safeColor(c.surfaceElevated, fallback.surfaceElevated),
    "--c-text": safeColor(c.text, fallback.text),
    "--c-muted": safeColor(c.textMuted, fallback.textMuted),
    "--c-primary": safeColor(c.primary, fallback.primary),
    "--c-primary-dark": safeColor(c.primaryDark, fallback.primaryDark),
    "--c-accent": safeColor(c.accent, fallback.accent),
    "--c-accent-soft": safeColor(c.accentSoft, fallback.accentSoft),
    "--c-border": safeColor(c.border, fallback.border),
    "--c-on-primary": contrastText(safeColor(c.primary, fallback.primary)),
    "--c-on-accent": contrastText(safeColor(c.accent, fallback.accent)),
    "--radius": `${clamp(appearance.radius, 0, 48)}px`,
    "--radius-sm": `${Math.round(clamp(appearance.radius, 0, 48) * 0.5)}px`,
    "--radius-lg": `${Math.round(clamp(appearance.radius, 0, 48) * 1.6)}px`,
    "--shadow-strength": `${clamp(appearance.shadowStrength, 0, 1)}`,
    "--glass-opacity": `${clamp(appearance.glassOpacity, 0, 0.4)}`,
    "--heading-scale": `${clamp(appearance.headingScale, 0.75, 1.5)}`,
    "--font-heading": cssFontStack(appearance.fontHeading, "Sora"),
    "--font-body": cssFontStack(appearance.fontBody, "Inter"),
    "--motion-speed": `${clamp(appearance.animationSpeed, 0.25, 2)}`,
    "--btn-radius":
      appearance.buttonStyle === "pill"
        ? "999px"
        : appearance.buttonStyle === "square"
          ? "4px"
          : "var(--radius-sm)",
  };

  const [br, bg, bb] = hexToRgb(safeColor(c.background, fallback.background));
  const [pr, pg, pb] = hexToRgb(safeColor(c.primary, fallback.primary));
  const [ar, ag, ab] = hexToRgb(safeColor(c.accent, fallback.accent));
  const [tr, tg, tb] = hexToRgb(safeColor(c.text, fallback.text));
  entries["--c-bg-rgb"] = `${br} ${bg} ${bb}`;
  entries["--c-primary-rgb"] = `${pr} ${pg} ${pb}`;
  entries["--c-accent-rgb"] = `${ar} ${ag} ${ab}`;
  entries["--c-text-rgb"] = `${tr} ${tg} ${tb}`;

  return Object.entries(entries)
    .map(([key, value]) => `${key}:${value};`)
    .join("");
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function cssFontStack(font: string, fallback: string): string {
  const name = (font || fallback).replace(/["'\;{}]/g, "");
  return `"${name}", "${fallback}", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`;
}

/** Google Fonts URL for the two selected families (the only allowed remote assets). */
export function googleFontsHref(appearance: AppearanceSettings): string {
  const families = Array.from(
    new Set([appearance.fontHeading, appearance.fontBody, "Inter"].filter(Boolean)),
  );
  const params = families
    .map(
      (family) =>
        `family=${encodeURIComponent(family.replace(/ /g, "+")).replace(/%2B/g, "+")}:wght@300;400;500;600;700;800`,
    )
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}
