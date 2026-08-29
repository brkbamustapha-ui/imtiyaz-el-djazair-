import type { Metadata } from "next";
import { parseJson } from "./json";

export type PageSeo = {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  canonical?: string;
  noindex?: boolean;
};

export function parsePageSeo(seoJson: string | null | undefined): PageSeo {
  return parseJson<PageSeo>(seoJson, {});
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"]);

/** Adds the scheme Vercel's host variables omit, and drops a trailing slash. */
function normaliseBase(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withScheme.replace(/\/+$/, "");
}

function isLoopback(base: string): boolean {
  try {
    return LOOPBACK_HOSTS.has(new URL(base).hostname);
  } catch {
    return false;
  }
}

let cachedBase: string | null = null;

/**
 * The site's public base URL, without a trailing slash.
 *
 * NEXT_PUBLIC_SITE_URL wins, because it is the only place a custom domain can
 * be declared. But it ships as "http://localhost:3000" and is easy to leave
 * that way, and a loopback address is never a valid public base: left alone it
 * publishes "localhost" into robots.txt, sitemap.xml, every canonical, every
 * Open Graph tag and the JSON-LD — telling search engines to fetch the sitemap
 * from their own machine.
 *
 * So a loopback value defers to the host. VERCEL_PROJECT_PRODUCTION_URL is the
 * project's production domain and stays the same on preview builds, which is
 * what canonicals want; VERCEL_URL is the per-deployment host, used only before
 * a production domain exists. Setting NEXT_PUBLIC_SITE_URL to the real domain
 * still overrides all of it.
 */
export function siteBaseUrl(): string {
  if (cachedBase) return cachedBase;

  const configured = normaliseBase(process.env.NEXT_PUBLIC_SITE_URL);
  const deployed =
    normaliseBase(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    normaliseBase(process.env.VERCEL_URL);

  cachedBase =
    (configured && !isLoopback(configured) ? configured : null) ??
    deployed ??
    configured ??
    "http://localhost:3000";

  return cachedBase;
}

export function siteUrl(path = "/"): string {
  return `${siteBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Absolute form of a stored path, leaving a full URL untouched. */
export function absoluteUrl(value: string): string {
  return /^https?:\/\//i.test(value.trim()) ? value.trim() : siteUrl(value.trim());
}

/** Site-wide share image, used whenever a page has nothing more specific. */
const DEFAULT_SHARE_IMAGE = "/assets/social-card.png";

export function metadataFromPageSeo(
  seo: PageSeo,
  fallback: {
    title: string;
    description: string;
    path: string;
    /** Page-specific share image — a post's cover, or the school's own file. */
    ogImage?: string | null;
  },
): Metadata {
  const title = seo.title?.trim() || fallback.title;
  const description = seo.description?.trim() || fallback.description;
  const url = absoluteUrl(seo.canonical?.trim() || siteUrl(fallback.path));

  // Next.js replaces the layout's openGraph outright when a page supplies its
  // own — it does not merge the two. Emitting `images: undefined` here left
  // every public page with no share picture at all while /admin/login, which
  // overrides nothing, kept one. So always resolve an image.
  const share = absoluteUrl(
    seo.ogImage?.trim() || fallback.ogImage?.trim() || DEFAULT_SHARE_IMAGE,
  );

  return {
    title,
    description,
    keywords: seo.keywords?.length ? seo.keywords : undefined,
    alternates: { canonical: url },
    robots: seo.noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: [{ url: share, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [share],
    },
  };
}
