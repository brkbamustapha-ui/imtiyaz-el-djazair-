"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { COLLECTIONS, isCollectionKey, type CollectionKey } from "@/lib/collections";
import { coerceForColumn, fail, ok, type ActionResult } from "./_helpers";

/**
 * One generic CRUD entry point for every simple content collection.
 * The collection key is checked against a whitelist and every value is coerced
 * by its declared field type before it reaches Prisma.
 */

type Delegate = {
  create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
  update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<{ id: string }>;
  delete: (args: { where: { id: string } }) => Promise<{ id: string }>;
  findMany: (args?: Record<string, unknown>) => Promise<{ id: string }[]>;
  findFirst: (args?: Record<string, unknown>) => Promise<{ order?: number } | null>;
};

function delegateFor(key: CollectionKey): Delegate {
  const map: Record<CollectionKey, unknown> = {
    services: db.service,
    stats: db.stat,
    testimonials: db.testimonial,
    faq: db.faqItem,
    gallery: db.galleryItem,
    partners: db.partner,
    popups: db.popup,
  };
  return map[key] as Delegate;
}

function refresh() {
  revalidatePath("/", "layout");
}

/** Popups store two optional dates; everything else is plain columns. */
function postProcess(key: CollectionKey, data: Record<string, unknown>) {
  if (key !== "popups") return data;
  const result = { ...data };
  for (const field of ["startsAt", "endsAt"]) {
    const raw = String(result[field] ?? "").trim();
    result[field] = raw && !Number.isNaN(Date.parse(raw)) ? new Date(raw) : null;
  }
  return result;
}

export async function saveCollectionItemAction(
  collection: string,
  id: string | null,
  payload: Record<string, unknown>,
): Promise<ActionResult> {
  if (!isCollectionKey(collection)) return fail("Unknown collection.");
  const definition = COLLECTIONS[collection];

  const user = await requirePermission(definition.permission).catch(() => null);
  if (!user) return fail("You do not have permission to change this.");

  const data: Record<string, unknown> = {};
  definition.fields.forEach((field) => {
    data[field.name] = coerceForColumn(field, payload[field.name]);
  });

  const titleValue = String(data[definition.titleField] ?? "").trim();
  if (titleValue === "") return fail(`${definition.singular} needs a ${definition.titleField}.`);

  const prepared = postProcess(collection, data);
  const delegate = delegateFor(collection);

  if (id) {
    const updated = await delegate.update({ where: { id }, data: prepared }).catch(() => null);
    if (!updated) return fail("That item no longer exists.");
    await logAdminAction({ userId: user.id, action: `${collection}.updated`, entityType: collection, entityId: id });
    refresh();
    return ok(`${definition.singular} saved.`, id);
  }

  if (definition.orderable) {
    const last = await delegate.findFirst({ orderBy: { order: "desc" } });
    prepared.order = ((last?.order ?? -1) as number) + 1;
  }
  const created = await delegate.create({ data: prepared });
  await logAdminAction({ userId: user.id, action: `${collection}.created`, entityType: collection, entityId: created.id });
  refresh();
  return ok(`${definition.singular} added.`, created.id);
}

export async function deleteCollectionItemAction(
  collection: string,
  id: string,
): Promise<ActionResult> {
  if (!isCollectionKey(collection)) return fail("Unknown collection.");
  const definition = COLLECTIONS[collection];
  const user = await requirePermission(definition.permission).catch(() => null);
  if (!user) return fail("You do not have permission to delete this.");

  const deleted = await delegateFor(collection).delete({ where: { id } }).catch(() => null);
  if (!deleted) return fail("That item no longer exists.");

  await logAdminAction({ userId: user.id, action: `${collection}.deleted`, entityType: collection, entityId: id });
  refresh();
  return ok(`${definition.singular} deleted.`);
}

export async function reorderCollectionAction(
  collection: string,
  orderedIds: string[],
): Promise<ActionResult> {
  if (!isCollectionKey(collection)) return fail("Unknown collection.");
  const definition = COLLECTIONS[collection];
  if (!definition.orderable) return fail("This collection cannot be reordered.");

  const user = await requirePermission(definition.permission).catch(() => null);
  if (!user) return fail("Not allowed.");

  const delegate = delegateFor(collection);
  const existing = await delegate.findMany({ select: { id: true } });
  const valid = new Set(existing.map((row) => row.id));
  const ids = orderedIds.filter((rowId) => valid.has(rowId));
  if (ids.length !== existing.length) return fail("The list changed — reload and try again.");

  // Sequential rather than $transaction: the delegate is accessed through a
  // structural type, so Prisma's PrismaPromise brand is not visible here.
  for (const [index, rowId] of ids.entries()) {
    await delegate.update({ where: { id: rowId }, data: { order: index } });
  }
  refresh();
  return ok("Order saved.");
}

export async function toggleCollectionItemAction(
  collection: string,
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  if (!isCollectionKey(collection)) return fail("Unknown collection.");
  const definition = COLLECTIONS[collection];
  const user = await requirePermission(definition.permission).catch(() => null);
  if (!user) return fail("Not allowed.");

  const updated = await delegateFor(collection)
    .update({ where: { id }, data: { isActive } })
    .catch(() => null);
  if (!updated) return fail("That item no longer exists.");

  refresh();
  return ok(isActive ? "Now visible on the website." : "Hidden from the website.");
}
