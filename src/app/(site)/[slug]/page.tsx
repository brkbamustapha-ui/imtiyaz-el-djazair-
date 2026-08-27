import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { getPageMeta, getPageSections } from "@/server/content";
import { getAllSettings } from "@/lib/settings";
import { getLocale } from "@/lib/locale";
import { metadataFromPageSeo, parsePageSeo } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [page, settings] = await Promise.all([getPageMeta(slug), getAllSettings()]);
  if (!page) return { title: "Page not found" };

  return metadataFromPageSeo(parsePageSeo(page.seoJson), {
    title: page.title,
    description: settings.seo.defaultDescription,
    path: `/${slug}`,
  });
}

export default async function CmsPage({ params }: Props) {
  const { slug } = await params;
  if (slug === "home") notFound();

  const [sections, locale] = await Promise.all([getPageSections(slug), getLocale()]);
  if (!sections) notFound();

  return (
    <div className="pt-[var(--header-h)]">
      <SectionRenderer sections={sections} locale={locale} />
    </div>
  );
}
