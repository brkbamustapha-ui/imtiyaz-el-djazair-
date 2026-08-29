import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getAllSettings } from "@/lib/settings";
import { getBrandLogos } from "@/lib/brand";
import { appearanceToCssVars, googleFontsHref } from "@/lib/theme";
import { getLocale } from "@/lib/locale";
import { LOCALE_META } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { siteBaseUrl } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [{ seo, general }, logos] = await Promise.all([getAllSettings(), getBrandLogos()]);
  const base = siteBaseUrl();
  const shareImage = logos.ogImage ?? "/assets/social-card.png";
  return {
    metadataBase: new URL(base),
    title: {
      default: seo.defaultTitle,
      template: seo.titleTemplate.includes("%s") ? seo.titleTemplate : `%s | ${general.siteName}`,
    },
    description: seo.defaultDescription,
    applicationName: general.siteName,
    keywords: seo.keywords,
    // Only ever the school's own file — no generated icon is shipped.
    icons: logos.favicon ? { icon: [{ url: logos.favicon }], apple: logos.favicon } : undefined,
    openGraph: {
      type: "website",
      siteName: general.siteName,
      title: seo.defaultTitle,
      description: seo.defaultDescription,
      url: base,
      images: [{ url: shareImage, width: 1200, height: 630, alt: general.siteName }],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.defaultTitle,
      description: seo.defaultDescription,
      site: seo.twitterHandle || undefined,
      images: [shareImage],
    },
    robots: seo.robotsIndex
      ? { index: true, follow: true }
      : { index: false, follow: false },
    verification: seo.googleSiteVerification
      ? { google: seo.googleSiteVerification }
      : undefined,
  };
}

// The browser paints its own chrome with this on mobile, so it has to track
// the theme rather than sit on a colour the site no longer uses.
export async function generateViewport(): Promise<Viewport> {
  const { appearance } = await getAllSettings();
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: appearance.colors.background,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = await getAllSettings();
  const locale = await getLocale();
  const meta = LOCALE_META[locale];
  const allowScripts = process.env.ALLOW_CUSTOM_SCRIPTS === "true";
  const { appearance, advanced } = settings;

  return (
    <html
      lang={meta.htmlLang}
      dir={meta.dir}
      data-motion={appearance.animationsEnabled ? "on" : "off"}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={googleFontsHref(appearance)} />
        {/* Theme tokens written by Admin -> Appearance. */}
        <style
          id="ied-theme"
          dangerouslySetInnerHTML={{ __html: `:root{${appearanceToCssVars(appearance)}}` }}
        />
        {advanced.customCss.trim() !== "" && (
          <style
            id="ied-custom-css"
            dangerouslySetInnerHTML={{
              __html: advanced.customCss.replace(/<\/?(style|script)/gi, ""),
            }}
          />
        )}
        {/* Custom head scripts are Super Admin only AND require ALLOW_CUSTOM_SCRIPTS=true. */}
        {allowScripts && advanced.headScripts.trim() !== "" && (
          <script dangerouslySetInnerHTML={{ __html: advanced.headScripts }} />
        )}
      </head>
      <body className={appearance.grain ? "grain" : undefined}>
        {children}
        {allowScripts && advanced.bodyEndScripts.trim() !== "" && (
          <script dangerouslySetInnerHTML={{ __html: advanced.bodyEndScripts }} />
        )}
        <span className="sr-only">{t(settings.general.tagline, locale)}</span>
      </body>
    </html>
  );
}
