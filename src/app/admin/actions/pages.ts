"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { stringifyJson } from "@/lib/json";
import { slugify } from "@/lib/utils";
import { fail, ok, sanitiseAssetPath, type ActionResult } from "./_helpers";

const RESERVED_SLUGS = ["admin", "api", "news", "uploads", "assets", "_next", "sitemap.xml", "robots.txt"];

const pageSchema = z.object({
  title: z.string().trim().min(1, "Give the page a title.").max(120),
  slug: z.string().trim().max(80).optional(),
  isPublished: z.boolean().optional(),
  showInNav: z.boolean().optional(),
});

const seoSchema = z.object({
  title: z.string().trim().max(160).optional(),
  description: z.string().trim().max(400).optional(),
  keywords: z.array(z.string().trim().max(60)).max(20).optional(),
  ogImage: z.string().trim().max(600).optional(),
  canonical: z.string().trim().max(600).optional(),
  noindex: z.boolean().optional(),
});

function refresh() {
  revalidatePath("/", "layout");
}

export async function createPageAction(input: {
  title: string;
  slug?: string;
  copyFromId?: string;
}): Promise<ActionResult> {
  const user = await requirePermission("pages.manage").catch(() => null);
  if (!user) return fail("You do not have permission to create pages.");

  const parsed = pageSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form.");

  const slug = slugify(parsed.data.slug || parsed.data.title);
  if (!slug) return fail("That title cannot be turned into a URL — add some letters or numbers.");
  if (RESERVED_SLUGS.includes(slug)) return fail(`“${slug}” is reserved. Choose another URL.`);
  if (await db.page.findUnique({ where: { slug } })) {
    return fail(`A page already uses the URL /${slug}.`);
  }

  const last = await db.page.findFirst({ orderBy: { order: "desc" } });
  const page = await db.page.create({
    data: {
      slug,
      title: parsed.data.title.trim(),
      isPublished: false,
      order: (last?.order ?? -1) + 1,
      seoJson: "{}",
    },
  });

  if (input.copyFromId) {
    const source = await db.section.findMany({
      where: { pageId: input.copyFromId },
      orderBy: { order: "asc" },
    });
    for (const section of source) {
      await db.section.create({
        data: {
          pageId: page.id,
          type: section.type,
          name: section.name,
          order: section.order,
          isEnabled: section.isEnabled,
          dataJson: section.dataJson,
        },
      });
    }
  }

  await logAdminAction({ userId: user.id, action: "page.created", entityType: "page", entityId: page.id, meta: { slug } });
  refresh();
  return ok(`Page created at /${slug}. It is unpublished until you publish it.`, page.id);
}

export async function updatePageAction(
  pageId: string,
  input: { title: string; slug: string; isPublished: boolean; showInNav: boolean },
): Promise<ActionResult> {
  const user = await requirePermission("pages.manage").catch(() => null);
  if (!user) return fail("You do not have permission to edit pages.");

  const page = await db.page.findUnique({ where: { id: pageId } });
  if (!page) return fail("That page no longer exists.");

  const parsed = pageSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form.");

  // The home page URL is fixed: the site would have no root without it.
  const slug = page.isSystem ? page.slug : slugify(input.slug || input.title);
  if (!slug) return fail("The URL cannot be empty.");
  if (!page.isSystem && RESERVED_SLUGS.includes(slug)) return fail(`“${slug}” is reserved.`);
  if (slug !== page.slug) {
    const clash = await db.page.findUnique({ where: { slug } });
    if (clash) return fail(`A page already uses the URL /${slug}.`);
  }

  await db.page.update({
    where: { id: pageId },
    data: {
      title: parsed.data.title.trim(),
      slug,
      isPublished: input.isPublished,
      showInNav: input.showInNav,
    },
  });
  await logAdminAction({ userId: user.id, action: "page.updated", entityType: "page", entityId: pageId });
  refresh();
  return ok("Page saved.");
}

export async function updatePageSeoAction(
  pageId: string,
  seo: Record<string, unknown>,
): Promise<ActionResult> {
  const user = await requirePermission("seo.manage").catch(() => null);
  if (!user) return fail("You do not have permission to change SEO settings.");

  const parsed = seoSchema.safeParse({
    ...seo,
    keywords: Array.isArray(seo.keywords)
      ? seo.keywords
      : String(seo.keywords ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form.");

  const clean = {
    ...parsed.data,
    ogImage: sanitiseAssetPath(parsed.data.ogImage ?? ""),
  };

  const updated = await db.page
    .update({ where: { id: pageId }, data: { seoJson: stringifyJson(clean) } })
    .catch(() => null);
  if (!updated) return fail("That page no longer exists.");

  await logAdminAction({ userId: user.id, action: "page.seo_updated", entityType: "page", entityId: pageId });
  refresh();
  return ok("SEO settings saved.");
}

export async function deletePageAction(pageId: string): Promise<ActionResult> {
  const user = await requirePermission("pages.manage").catch(() => null);
  if (!user) return fail("You do not have permission to delete pages.");

  const page = await db.page.findUnique({ where: { id: pageId } });
  if (!page) return fail("That page no longer exists.");
  if (page.isSystem) return fail("The home page cannot be deleted.");

  await db.page.delete({ where: { id: pageId } });
  await logAdminAction({ userId: user.id, action: "page.deleted", entityType: "page", entityId: pageId, meta: { slug: page.slug } });
  refresh();
  return ok(`Page /${page.slug} deleted.`);
}

export async function duplicatePageAction(pageId: string): Promise<ActionResult> {
  const source = await db.page.findUnique({ where: { id: pageId } });
  if (!source) return fail("That page no longer exists.");
  return createPageAction({
    title: `${source.title} (copy)`,
    slug: `${source.slug}-copy`,
    copyFromId: pageId,
  });
}

export async function togglePagePublishedAction(
  pageId: string,
  isPublished: boolean,
): Promise<ActionResult> {
  const user = await requirePermission("content.publish").catch(() => null);
  if (!user) return fail("Only an Admin can publish or unpublish a page.");

  const page = await db.page.findUnique({ where: { id: pageId } });
  if (!page) return fail("That page no longer exists.");
  if (page.isSystem && !isPublished) return fail("The home page cannot be unpublished.");

  await db.page.update({ where: { id: pageId }, data: { isPublished } });
  await logAdminAction({ userId: user.id, action: isPublished ? "page.published" : "page.unpublished", entityType: "page", entityId: pageId });
  refresh();
  return ok(isPublished ? "Page published." : "Page unpublished.");
}
