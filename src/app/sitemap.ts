import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [pages, posts] = await Promise.all([
    db.page.findMany({ where: { isPublished: true } }).catch(() => []),
    db.post
      .findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } })
      .catch(() => []),
  ]);

  const pageEntries: MetadataRoute.Sitemap = pages.map((page) => ({
    url: siteUrl(page.slug === "home" ? "/" : `/${page.slug}`),
    lastModified: page.updatedAt,
    changeFrequency: page.slug === "home" ? "weekly" : "monthly",
    priority: page.slug === "home" ? 1 : 0.7,
  }));

  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: siteUrl(`/news/${post.slug}`),
    lastModified: post.updatedAt,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [
    ...pageEntries,
    { url: siteUrl("/news"), changeFrequency: "weekly", priority: 0.8 },
    ...postEntries,
  ];
}
