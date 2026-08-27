import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { parseJson } from "@/lib/json";
import { isPreviewMode } from "@/lib/preview";

export type SectionData = Record<string, unknown>;

export type RenderableSection = {
  id: string;
  type: string;
  name: string;
  order: number;
  data: SectionData;
  isDraft: boolean;
};

export type MenuNode = {
  id: string;
  label: string;
  href: string;
  openInNewTab: boolean;
  children: MenuNode[];
};

/** Sections for a page, resolved against draft or published content. */
export async function getPageSections(slug: string): Promise<RenderableSection[] | null> {
  const preview = await isPreviewMode();
  const page = await db.page.findUnique({
    where: { slug },
    include: { sections: { orderBy: { order: "asc" } } },
  });
  if (!page) return null;
  if (!page.isPublished && !preview) return null;

  return page.sections
    .filter((section) => section.isEnabled)
    .map((section) => {
      const useDraft = preview && section.draftJson !== null;
      return {
        id: section.id,
        type: section.type,
        name: section.name,
        order: section.order,
        data: parseJson<SectionData>(useDraft ? section.draftJson : section.dataJson, {}),
        isDraft: useDraft,
      };
    });
}

export const getPageMeta = cache(async function getPageMeta(slug: string) {
  return db.page.findUnique({ where: { slug } });
});

export const getMenu = cache(async function getMenu(menuKey: string): Promise<MenuNode[]> {
  const items = await db.menuItem
    .findMany({ where: { menuKey, isActive: true }, orderBy: { order: "asc" } })
    .catch(() => []);

  const roots: MenuNode[] = [];
  const byId = new Map<string, MenuNode>();
  items.forEach((item) => {
    byId.set(item.id, {
      id: item.id,
      label: item.label,
      href: item.href,
      openInNewTab: item.openInNewTab,
      children: [],
    });
  });
  items.forEach((item) => {
    const node = byId.get(item.id);
    if (!node) return;
    if (item.parentId && byId.has(item.parentId)) {
      byId.get(item.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
});

export const getActivePartners = cache(async function getActivePartners(type?: string) {
  return db.partner
    .findMany({
      where: { isActive: true, ...(type && type !== "ALL" ? { type } : {}) },
      orderBy: { order: "asc" },
    })
    .catch(() => []);
});

export const getServices = cache(async function getServices(limit = 12) {
  return db.service
    .findMany({ where: { isActive: true }, orderBy: { order: "asc" }, take: limit })
    .catch(() => []);
});

export const getStats = cache(async function getStats() {
  return db.stat
    .findMany({ where: { isActive: true }, orderBy: { order: "asc" } })
    .catch(() => []);
});

export const getTestimonials = cache(async function getTestimonials(limit = 12) {
  return db.testimonial
    .findMany({ where: { isActive: true }, orderBy: { order: "asc" }, take: limit })
    .catch(() => []);
});

export const getFaq = cache(async function getFaq(limit = 20) {
  return db.faqItem
    .findMany({ where: { isActive: true }, orderBy: { order: "asc" }, take: limit })
    .catch(() => []);
});

export const getGallery = cache(async function getGallery(album?: string, limit = 24) {
  return db.galleryItem
    .findMany({
      where: { isActive: true, ...(album ? { album } : {}) },
      orderBy: { order: "asc" },
      take: limit,
    })
    .catch(() => []);
});

export const getPosts = cache(async function getPosts(options: {
  type?: "NEWS" | "EVENT" | "ALL";
  limit?: number;
}) {
  const { type = "ALL", limit = 6 } = options;
  return db.post
    .findMany({
      where: { isPublished: true, ...(type !== "ALL" ? { type } : {}) },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: limit,
    })
    .catch(() => []);
});

export const getPostBySlug = cache(async function getPostBySlug(slug: string) {
  const preview = await isPreviewMode();
  const post = await db.post.findUnique({ where: { slug } }).catch(() => null);
  if (!post) return null;
  if (!post.isPublished && !preview) return null;
  return post;
});

export const getFormBySlug = cache(async function getFormBySlug(slug: string) {
  return db.form.findUnique({ where: { slug } }).catch(() => null);
});

export const getActivePopup = cache(async function getActivePopup() {
  const now = new Date();
  const popups = await db.popup
    .findMany({ where: { isActive: true }, orderBy: { updatedAt: "desc" } })
    .catch(() => []);
  return (
    popups.find((popup) => {
      if (popup.startsAt && popup.startsAt > now) return false;
      if (popup.endsAt && popup.endsAt < now) return false;
      return true;
    }) ?? null
  );
});

export const getPublishedPages = cache(async function getPublishedPages() {
  return db.page
    .findMany({ where: { isPublished: true }, orderBy: { order: "asc" } })
    .catch(() => []);
});
