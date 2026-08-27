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

export function siteUrl(path = "/"): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function metadataFromPageSeo(
  seo: PageSeo,
  fallback: { title: string; description: string; path: string },
): Metadata {
  const title = seo.title?.trim() || fallback.title;
  const description = seo.description?.trim() || fallback.description;
  const url = seo.canonical?.trim() || siteUrl(fallback.path);

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
      images: seo.ogImage ? [{ url: seo.ogImage }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: seo.ogImage ? [seo.ogImage] : undefined,
    },
  };
}
