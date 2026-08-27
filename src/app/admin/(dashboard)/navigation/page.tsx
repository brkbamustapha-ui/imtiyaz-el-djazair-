import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { getMenu } from "@/server/content";
import { getSetting } from "@/lib/settings";
import { isLocale, type Locale } from "@/lib/i18n";
import { PageHeader } from "@/components/admin/ui";
import { MenuEditor } from "@/components/admin/MenuEditor";

export const metadata: Metadata = { title: "Menu" };

export default async function NavigationPage() {
  const user = await requirePermission("navigation.manage").catch(() => null);
  if (!user) notFound();

  const [menu, pages, general] = await Promise.all([
    getMenu("header"),
    db.page.findMany({ where: { isPublished: true }, orderBy: { order: "asc" } }),
    getSetting("general"),
  ]);
  const locales = general.enabledLocales.filter(isLocale) as Locale[];

  return (
    <>
      <PageHeader
        title="Menu"
        description="The links in the header. Drag to reorder, add sub-menus, or point an item anywhere you like."
      />
      <MenuEditor
        locales={locales.length > 0 ? locales : ["en"]}
        initial={menu}
        suggestions={[
          { label: "Home", href: "/" },
          { label: "News & Events", href: "/news" },
          ...pages
            .filter((page) => page.slug !== "home")
            .map((page) => ({ label: page.title, href: `/${page.slug}` })),
        ]}
      />
    </>
  );
}
