import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { parseJson } from "@/lib/json";
import { getSetting } from "@/lib/settings";
import { isLocale, type Locale } from "@/lib/i18n";
import { PageHeader, Notice } from "@/components/admin/ui";
import { WebsiteBuilder } from "@/components/admin/WebsiteBuilder";

export const metadata: Metadata = { title: "Website Builder" };

export default async function BuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requirePermission("content.edit").catch(() => null);
  if (!user) notFound();

  const { page: requestedPageId } = await searchParams;
  const [pages, general] = await Promise.all([
    db.page.findMany({ orderBy: [{ isSystem: "desc" }, { order: "asc" }] }),
    getSetting("general"),
  ]);

  if (pages.length === 0) {
    return (
      <>
        <PageHeader title="Website Builder" />
        <Notice tone="warn">
          There are no pages yet. Run <code>npm run db:seed</code>, or create one in
          <strong> Pages</strong>.
        </Notice>
      </>
    );
  }

  const activePage = pages.find((page) => page.id === requestedPageId) ?? pages[0];
  const sections = await db.section.findMany({
    where: { pageId: activePage.id },
    orderBy: { order: "asc" },
  });

  const locales = general.enabledLocales.filter(isLocale) as Locale[];

  return (
    <>
      <PageHeader
        title="Website Builder"
        description="Reorder, hide, duplicate and edit every block on the page. Changes are saved as a draft first — nothing goes live until you publish."
      />
      <WebsiteBuilder
        pages={pages.map((page) => ({
          id: page.id,
          slug: page.slug,
          title: page.title,
          isPublished: page.isPublished,
        }))}
        activePage={{
          id: activePage.id,
          slug: activePage.slug,
          title: activePage.title,
          isPublished: activePage.isPublished,
        }}
        sections={sections.map((section) => ({
          id: section.id,
          type: section.type,
          name: section.name,
          order: section.order,
          isEnabled: section.isEnabled,
          hasDraft: section.draftJson !== null,
          data: parseJson<Record<string, unknown>>(section.draftJson ?? section.dataJson, {}),
        }))}
        locales={locales.length > 0 ? locales : ["en"]}
        canPublish={can(user.role, "content.publish")}
        canManagePages={can(user.role, "pages.manage")}
      />
    </>
  );
}
