import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import { cache } from "react";
import sharp from "sharp";
import { getSetting } from "./settings";
import { fileExists, getFile, keyFromMediaUrl } from "./storage";

/**
 * The logo is ALWAYS a real image file supplied by the school — nothing is
 * drawn in code. Resolution order:
 *   1. the file uploaded from Admin -> Site settings (stored in /public/uploads)
 *   2. an artwork file dropped into /public/assets/logo (see the README there)
 *   3. nothing — callers then show the school name as plain text
 */
const CANDIDATE_EXTENSIONS = [".svg", ".png", ".webp", ".jpg", ".jpeg", ".avif"];

/**
 * Looks in both places a supplied file can live:
 *   - the `brand/` folder of the file store — uploaded at runtime, served by /media
 *   - `public/assets/logo/` — committed with the repo, served by Next directly
 *     (only works if the file is present when `next build` runs)
 *
 * The committed path is checked with existsSync, which is correct even on a
 * serverless host: /public ships inside the deployment and is read-only there,
 * which is exactly what it needs to be.
 */
async function findSuppliedFile(basename: string): Promise<string | null> {
  for (const extension of CANDIDATE_EXTENSIONS) {
    if (await fileExists(`brand/${basename}${extension}`)) {
      return `/media/brand/${basename}${extension}`;
    }
  }
  for (const extension of CANDIDATE_EXTENSIONS) {
    const relative = `/assets/logo/${basename}${extension}`;
    if (existsSync(path.join(process.cwd(), "public", relative))) return relative;
  }
  return null;
}

/** True for a path that points at a file the owner actually supplied. */
function isSuppliedFile(url: string | undefined): url is string {
  if (!url) return false;
  return url.startsWith("/media/") || url.startsWith("/assets/logo/");
}

export type BrandLogos = {
  /** Logo for the site's own background. Null when no file has been supplied. */
  primary: string | null;
  /**
   * The primary logo's real pixel size, when it could be read.
   *
   * <Image> needs width/height to reserve a box before the file arrives. Giving
   * it invented numbers reserves the wrong shape: the school's mark is roughly
   * 1:2, so a square guess reserves a box twice too wide and the header jumps
   * when the image lands. `object-contain` keeps the artwork itself undistorted
   * either way — this is about the space around it.
   */
  primarySize: { width: number; height: number } | null;
  /** Optional light-coloured variant for dark surfaces. */
  onDark: string | null;
  favicon: string | null;
  ogImage: string | null;
};

/** Reads the intrinsic size of a supplied logo, wherever it is stored. */
async function measure(url: string | null): Promise<{ width: number; height: number } | null> {
  if (!url) return null;
  // SVG has no meaningful pixel size and scales cleanly; nothing to reserve.
  if (url.endsWith(".svg")) return null;
  try {
    if (url.startsWith("/assets/")) {
      const metadata = await sharp(path.join(process.cwd(), "public", url)).metadata();
      return metadata.width && metadata.height
        ? { width: metadata.width, height: metadata.height }
        : null;
    }
    const key = keyFromMediaUrl(url);
    if (!key) return null;
    const blob = await getFile(key, false);
    if (!blob) return null;
    const metadata = await sharp(Buffer.from(blob.data)).metadata();
    return metadata.width && metadata.height
      ? { width: metadata.width, height: metadata.height }
      : null;
  } catch {
    return null;
  }
}

export const getBrandLogos = cache(async function getBrandLogos(): Promise<BrandLogos> {
  const general = await getSetting("general");

  const [logo, logoDark, favicon, ogImage] = await Promise.all([
    isSuppliedFile(general.logoUrl) ? general.logoUrl : findSuppliedFile("logo"),
    isSuppliedFile(general.logoDarkUrl) ? general.logoDarkUrl : findSuppliedFile("logo-dark"),
    isSuppliedFile(general.faviconUrl) ? general.faviconUrl : findSuppliedFile("favicon"),
    isSuppliedFile(general.ogImageUrl) ? general.ogImageUrl : findSuppliedFile("og-image"),
  ]);

  return {
    primary: logo,
    primarySize: await measure(logo),
    onDark: logoDark,
    favicon,
    ogImage,
  };
});
