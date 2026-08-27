"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { safeHref } from "@/lib/utils";
import { writeLocalized } from "@/lib/localized-field";
import { LOCALES, type LocalizedText } from "@/lib/i18n";
import { fail, ok, type ActionResult } from "./_helpers";

export type MenuItemInput = {
  id?: string;
  /** Either a plain string or `{ en, fr, ar }`. */
  label: string | LocalizedText;
  href: string;
  openInNewTab: boolean;
  isActive: boolean;
  children?: MenuItemInput[];
};

const MAX_ITEMS = 40;

/**
 * The whole menu is saved in one go: the editor sends the full tree and this
 * replaces it. Simpler and less error-prone than per-row patching, and the
 * menu is small.
 */
export async function saveMenuAction(
  menuKey: string,
  items: MenuItemInput[],
): Promise<ActionResult> {
  const user = await requirePermission("navigation.manage").catch(() => null);
  if (!user) return fail("You do not have permission to change the menu.");

  const key = menuKey.replace(/[^a-z0-9-_]/gi, "").slice(0, 32) || "header";

  const clean = (label: string | LocalizedText): string => {
    if (typeof label === "string") return label.trim().slice(0, 60);
    const trimmed: LocalizedText = {};
    LOCALES.forEach((locale) => {
      const value = label[locale];
      if (typeof value === "string" && value.trim() !== "") trimmed[locale] = value.trim().slice(0, 60);
    });
    return writeLocalized(trimmed);
  };

  const flat: { label: string; href: string; openInNewTab: boolean; isActive: boolean; parentIndex: number | null; order: number }[] = [];
  items.slice(0, MAX_ITEMS).forEach((item, index) => {
    const parentIndex = flat.length;
    flat.push({
      label: clean(item.label) || "Untitled",
      href: safeHref(item.href),
      openInNewTab: Boolean(item.openInNewTab),
      isActive: Boolean(item.isActive),
      parentIndex: null,
      order: index,
    });
    (item.children ?? []).slice(0, 12).forEach((child, childIndex) => {
      flat.push({
        label: clean(child.label) || "Untitled",
        href: safeHref(child.href),
        openInNewTab: Boolean(child.openInNewTab),
        isActive: Boolean(child.isActive),
        parentIndex,
        order: childIndex,
      });
    });
  });

  if (flat.length === 0) return fail("Add at least one menu item.");
  if (flat.length > MAX_ITEMS * 2) return fail("That menu is too large.");

  await db.menuItem.deleteMany({ where: { menuKey: key } });

  const createdIds: string[] = [];
  for (const entry of flat) {
    const created = await db.menuItem.create({
      data: {
        menuKey: key,
        label: entry.label,
        href: entry.href,
        openInNewTab: entry.openInNewTab,
        isActive: entry.isActive,
        order: entry.order,
        parentId: entry.parentIndex === null ? null : createdIds[entry.parentIndex],
      },
    });
    createdIds.push(created.id);
  }

  await logAdminAction({ userId: user.id, action: "menu.updated", entityType: "menu", entityId: key, meta: { items: flat.length } });
  revalidatePath("/", "layout");
  return ok("Menu saved.");
}
