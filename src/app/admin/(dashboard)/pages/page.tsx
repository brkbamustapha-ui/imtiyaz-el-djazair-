import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { parsePageSeo } from "@/lib/seo";
import { PageHeader } from "@/components/admin/ui";
import { PagesManager } from "@/components/admin/PagesManager";

export const metadata: Metadata = { title: "Pages" };

export default async function AdminPagesPage() {
  const user = await requirePermission("pages.manage").catch(() => null);
  if (!user) notFound();

  const pages = await db.page.findMany({
    orderBy: [{ isSystem: "desc" }, { order: "asc" }],
    include: { _count: { select: { sections: true } } },
  });

  return (
    <>
      <PageHeader
        title="Pages"
        description="Create, rename and publish pages. Use the Website Builder to change what is on each one."
      />
      <PagesManager
        pages={pages.map((page) => ({
          id: page.id,
          slug: page.slug,
          title: page.title,
          isPublished: page.isPublished,
          isSystem: page.isSystem,
          showInNav: page.showInNav,
          sectionCount: page._count.sections,
          seo: parsePageSeo(page.seoJson),
        }))}
        canPublish={can(user.role, "content.publish")}
        canEditSeo={can(user.role, "seo.manage")}
      />
    </>
  );
}
