"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { parseJson, stringifyJson } from "@/lib/json";
import { requirePermission, getCurrentUser } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { defaultsForType, getSectionType } from "@/lib/section-types";
import { coerceField } from "./_helpers";
import type { ActionResult } from "./_helpers";
import { fail, ok } from "./_helpers";

async function snapshot(sectionId: string, label: string) {
  const section = await db.section.findUnique({ where: { id: sectionId } });
  if (!section) return;
  const user = await getCurrentUser();
  await db.contentVersion.create({
    data: {
      entityType: "section",
      entityId: sectionId,
      label,
      snapshotJson: stringifyJson({
        name: section.name,
        type: section.type,
        dataJson: section.dataJson,
        isEnabled: section.isEnabled,
        order: section.order,
      }),
      userId: user?.id ?? null,
    },
  });
  // Keep the history bounded.
  const extra = await db.contentVersion.findMany({
    where: { entityType: "section", entityId: sectionId },
    orderBy: { createdAt: "desc" },
    skip: 20,
    select: { id: true },
  });
  if (extra.length > 0) {
    await db.contentVersion.deleteMany({ where: { id: { in: extra.map((row) => row.id) } } });
  }
}

function refresh() {
  revalidatePath("/", "layout");
}

/** Validate an incoming section payload against its declared field schema. */
function sanitiseSectionData(type: string, input: Record<string, unknown>) {
  const definition = getSectionType(type);
  if (!definition) return null;
  const clean: Record<string, unknown> = {};
  definition.fields.forEach((field) => {
    clean[field.name] = coerceField(field, input[field.name]);
  });
  return clean;
}

export async function saveSectionDraftAction(
  sectionId: string,
  payload: Record<string, unknown>,
): Promise<ActionResult> {
  const user = await requirePermission("content.edit").catch(() => null);
  if (!user) return fail("You do not have permission to edit content.");

  const section = await db.section.findUnique({ where: { id: sectionId } });
  if (!section) return fail("That section no longer exists.");

  const clean = sanitiseSectionData(section.type, payload);
  if (!clean) return fail("Unknown section type.");

  await db.section.update({
    where: { id: sectionId },
    data: { draftJson: stringifyJson(clean) },
  });
  await logAdminAction({ userId: user.id, action: "section.updated", entityType: "section", entityId: sectionId });
  return ok("Draft saved. Use Preview to check it, then Publish.");
}

export async function publishSectionAction(sectionId: string): Promise<ActionResult> {
  const user = await requirePermission("content.publish").catch(() => null);
  if (!user) return fail("Only an Admin can publish changes.");

  const section = await db.section.findUnique({ where: { id: sectionId } });
  if (!section) return fail("That section no longer exists.");
  if (section.draftJson === null) return fail("There is nothing to publish.");

  await snapshot(sectionId, "Before publish");
  await db.section.update({
    where: { id: sectionId },
    data: { dataJson: section.draftJson, draftJson: null },
  });
  await logAdminAction({ userId: user.id, action: "section.published", entityType: "section", entityId: sectionId });
  refresh();
  return ok("Published. The change is live on the website.");
}

export async function publishPageAction(pageId: string): Promise<ActionResult> {
  const user = await requirePermission("content.publish").catch(() => null);
  if (!user) return fail("Only an Admin can publish changes.");

  const sections = await db.section.findMany({ where: { pageId, NOT: { draftJson: null } } });
  if (sections.length === 0) return fail("There are no unpublished changes on this page.");

  for (const section of sections) {
    await snapshot(section.id, "Before publish");
    await db.section.update({
      where: { id: section.id },
      data: { dataJson: section.draftJson!, draftJson: null },
    });
  }
  await logAdminAction({
    userId: user.id,
    action: "section.published",
    entityType: "page",
    entityId: pageId,
    meta: { sections: sections.length },
  });
  refresh();
  return ok(`Published ${sections.length} change${sections.length === 1 ? "" : "s"}.`);
}

export async function discardDraftAction(sectionId: string): Promise<ActionResult> {
  const user = await requirePermission("content.edit").catch(() => null);
  if (!user) return fail("Not allowed.");
  await db.section.update({ where: { id: sectionId }, data: { draftJson: null } });
  return ok("Draft discarded — the published version is unchanged.");
}

export async function toggleSectionAction(sectionId: string, enabled: boolean): Promise<ActionResult> {
  const user = await requirePermission("content.publish").catch(() => null);
  if (!user) return fail("Only an Admin can show or hide a section.");
  await db.section.update({ where: { id: sectionId }, data: { isEnabled: enabled } });
  await logAdminAction({ userId: user.id, action: "section.updated", entityType: "section", entityId: sectionId, meta: { enabled } });
  refresh();
  return ok(enabled ? "Section is now visible." : "Section is now hidden.");
}

export async function renameSectionAction(sectionId: string, name: string): Promise<ActionResult> {
  const user = await requirePermission("content.edit").catch(() => null);
  if (!user) return fail("Not allowed.");
  const clean = name.trim().slice(0, 80) || "Untitled section";
  await db.section.update({ where: { id: sectionId }, data: { name: clean } });
  return ok("Renamed.");
}

export async function addSectionAction(pageId: string, type: string): Promise<ActionResult> {
  const user = await requirePermission("content.edit").catch(() => null);
  if (!user) return fail("Not allowed.");

  const definition = getSectionType(type);
  if (!definition) return fail("Unknown section type.");

  const last = await db.section.findFirst({ where: { pageId }, orderBy: { order: "desc" } });
  const created = await db.section.create({
    data: {
      pageId,
      type,
      name: definition.label,
      order: (last?.order ?? -1) + 1,
      isEnabled: true,
      dataJson: stringifyJson(defaultsForType(type)),
    },
  });
  await logAdminAction({ userId: user.id, action: "section.created", entityType: "section", entityId: created.id, meta: { type } });
  refresh();
  return ok(`${definition.label} section added.`, created.id);
}

export async function duplicateSectionAction(sectionId: string): Promise<ActionResult> {
  const user = await requirePermission("content.edit").catch(() => null);
  if (!user) return fail("Not allowed.");

  const section = await db.section.findUnique({ where: { id: sectionId } });
  if (!section) return fail("That section no longer exists.");

  await db.section.updateMany({
    where: { pageId: section.pageId, order: { gt: section.order } },
    data: { order: { increment: 1 } },
  });
  const created = await db.section.create({
    data: {
      pageId: section.pageId,
      type: section.type,
      name: `${section.name} (copy)`,
      order: section.order + 1,
      isEnabled: false,
      dataJson: section.dataJson,
    },
  });
  await logAdminAction({ userId: user.id, action: "section.created", entityType: "section", entityId: created.id, meta: { duplicatedFrom: sectionId } });
  refresh();
  return ok("Section duplicated (hidden until you enable it).", created.id);
}

export async function deleteSectionAction(sectionId: string): Promise<ActionResult> {
  const user = await requirePermission("content.publish").catch(() => null);
  if (!user) return fail("Only an Admin can delete a section.");

  await snapshot(sectionId, "Before delete");
  const section = await db.section.delete({ where: { id: sectionId } }).catch(() => null);
  if (!section) return fail("That section no longer exists.");

  await logAdminAction({ userId: user.id, action: "section.deleted", entityType: "section", entityId: sectionId, meta: { type: section.type } });
  refresh();
  return ok("Section deleted.");
}

export async function reorderSectionsAction(
  pageId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  const user = await requirePermission("content.edit").catch(() => null);
  if (!user) return fail("Not allowed.");

  const sections = await db.section.findMany({ where: { pageId }, select: { id: true } });
  const valid = new Set(sections.map((section) => section.id));
  const ids = orderedIds.filter((id) => valid.has(id));
  if (ids.length !== sections.length) return fail("The section list changed — reload and try again.");

  await db.$transaction(
    ids.map((id, index) => db.section.update({ where: { id }, data: { order: index } })),
  );
  await logAdminAction({ userId: user.id, action: "section.reordered", entityType: "page", entityId: pageId });
  refresh();
  return ok("Order saved.");
}

/* ------------------------------ Version history --------------------------- */

export async function restoreVersionAction(versionId: string): Promise<ActionResult> {
  const user = await requirePermission("content.publish").catch(() => null);
  if (!user) return fail("Only an Admin can restore a previous version.");

  const version = await db.contentVersion.findUnique({ where: { id: versionId } });
  if (!version || version.entityType !== "section") return fail("That version no longer exists.");

  const data = parseJson<{ name: string; dataJson: string; isEnabled: boolean }>(
    version.snapshotJson,
    { name: "", dataJson: "{}", isEnabled: true },
  );

  await snapshot(version.entityId, "Before restore");
  const updated = await db.section
    .update({
      where: { id: version.entityId },
      data: { name: data.name, dataJson: data.dataJson, isEnabled: data.isEnabled, draftJson: null },
    })
    .catch(() => null);
  if (!updated) return fail("The section this version belongs to has been deleted.");

  await logAdminAction({ userId: user.id, action: "section.restored", entityType: "section", entityId: version.entityId });
  refresh();
  return ok("Previous version restored and published.");
}

export type SectionVersion = {
  id: string;
  label: string;
  createdAt: string;
  userName: string;
};

export async function listSectionVersionsAction(sectionId: string): Promise<SectionVersion[]> {
  const user = await requirePermission("content.view").catch(() => null);
  if (!user) return [];

  const versions = await db.contentVersion.findMany({
    where: { entityType: "section", entityId: sectionId },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { user: { select: { name: true } } },
  });

  return versions.map((version) => ({
    id: version.id,
    label: version.label,
    createdAt: version.createdAt.toISOString(),
    userName: version.user?.name ?? "System",
  }));
}
