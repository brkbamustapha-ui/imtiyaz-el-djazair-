import { getMenu } from "@/server/content";
import { getAllSettings } from "@/lib/settings";
import { getEnabledLocales, getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { lt } from "@/lib/localized-field";
import type { MenuNode } from "@/server/content";
import { Logo } from "./Logo";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { NavbarClient } from "./NavbarClient";

const FALLBACK_MENU = [
  { id: "home", label: "Home", href: "/", openInNewTab: false, children: [] },
  { id: "about", label: "About", href: "/about", openInNewTab: false, children: [] },
  { id: "programs", label: "Programs", href: "/programs", openInNewTab: false, children: [] },
  { id: "ielts", label: "IELTS", href: "/ielts", openInNewTab: false, children: [] },
  { id: "exam", label: "Exam Center", href: "/exam-center", openInNewTab: false, children: [] },
  { id: "news", label: "News", href: "/news", openInNewTab: false, children: [] },
  { id: "contact", label: "Contact", href: "/contact", openInNewTab: false, children: [] },
];

export async function Navbar() {
  const [menu, settings, locale, locales] = await Promise.all([
    getMenu("header"),
    getAllSettings(),
    getLocale(),
    getEnabledLocales(),
  ]);

  // Menu labels are stored as localized JSON; resolve them for this language.
  const resolve = (nodes: MenuNode[]): MenuNode[] =>
    nodes.map((node) => ({
      ...node,
      label: lt(node.label, locale),
      children: resolve(node.children),
    }));

  const items = menu.length > 0 ? resolve(menu) : FALLBACK_MENU;
  const ctaLabel = t(settings.general.navCtaLabel, locale) || "Apply Now";
  const ctaHref = settings.general.navCtaHref || "/contact";

  return (
    <NavbarClient
      items={items}
      ctaLabel={ctaLabel}
      ctaHref={ctaHref}
      logo={
        <Logo
          siteName={settings.general.siteName}
          tagline={t(settings.general.tagline, locale)}
          logoUrl={settings.general.logoUrl}
        />
      }
      localeSwitcher={<LocaleSwitcher locales={locales} current={locale} />}
    />
  );
}
