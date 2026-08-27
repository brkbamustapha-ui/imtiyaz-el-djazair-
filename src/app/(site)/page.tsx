import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { JsonLd } from "@/components/public/JsonLd";
import { getPageMeta, getPageSections } from "@/server/content";
import { getAllSettings } from "@/lib/settings";
import { getLocale } from "@/lib/locale";
import { metadataFromPageSeo, parsePageSeo, siteUrl } from "@/lib/seo";
import { t } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const [page, settings] = await Promise.all([getPageMeta("home"), getAllSettings()]);
  return metadataFromPageSeo(parsePageSeo(page?.seoJson), {
    title: settings.seo.defaultTitle,
    description: settings.seo.defaultDescription,
    path: "/",
  });
}

export default async function HomePage() {
  const [sections, settings, locale] = await Promise.all([
    getPageSections("home"),
    getAllSettings(),
    getLocale(),
  ]);

  if (!sections) notFound();

  const { general, contact, social, seo } = settings;
  const socialLinks = Object.values(social).filter((value) => value.trim() !== "");

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": seo.organizationType || "EducationalOrganization",
            name: general.siteName,
            alternateName: t(general.tagline, locale),
            description: seo.defaultDescription,
            url: siteUrl("/"),
            logo: siteUrl(general.logoUrl),
            image: siteUrl(general.ogImageUrl),
            email: contact.email || undefined,
            telephone: contact.phonePrimary || undefined,
            sameAs: socialLinks.length > 0 ? socialLinks : undefined,
            address: {
              "@type": "PostalAddress",
              streetAddress: [contact.addressLine1, contact.addressLine2]
                .filter(Boolean)
                .join(", "),
              addressLocality: contact.city,
              addressCountry: contact.country,
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: general.siteName,
            url: siteUrl("/"),
            inLanguage: general.enabledLocales,
          },
        ]}
      />
      <SectionRenderer sections={sections} locale={locale} />
    </>
  );
}
