import "server-only";
import { db } from "@/lib/db";
import { COLLECTIONS, type CollectionKey } from "@/lib/collections";
import { plainText, readLocalized } from "@/lib/localized-field";

export type CollectionRow = {
  id: string;
  values: Record<string, unknown>;
  title: string;
  subtitle: string;
  image: string;
  isActive: boolean;
};

/**
 * Loads a collection for the admin, converting localized JSON columns back
 * into `{ en, fr, ar }` objects the editor can bind to.
 */
export async function loadCollection(key: CollectionKey): Promise<CollectionRow[]> {
  const definition = COLLECTIONS[key];
  const orderBy = definition.orderable
    ? ({ order: "asc" } as const)
    : ({ updatedAt: "desc" } as const);

  const finders: Record<CollectionKey, () => Promise<Record<string, unknown>[]>> = {
    services: () => db.service.findMany({ orderBy }) as Promise<Record<string, unknown>[]>,
    stats: () => db.stat.findMany({ orderBy: { order: "asc" } }) as Promise<Record<string, unknown>[]>,
    testimonials: () => db.testimonial.findMany({ orderBy }) as Promise<Record<string, unknown>[]>,
    faq: () => db.faqItem.findMany({ orderBy: { order: "asc" } }) as Promise<Record<string, unknown>[]>,
    gallery: () => db.galleryItem.findMany({ orderBy }) as Promise<Record<string, unknown>[]>,
    partners: () => db.partner.findMany({ orderBy }) as Promise<Record<string, unknown>[]>,
    popups: () => db.popup.findMany({ orderBy: { updatedAt: "desc" } }) as Promise<Record<string, unknown>[]>,
  };

  const rows = await finders[key]().catch(() => []);

  return rows.map((row) => {
    const values: Record<string, unknown> = {};
    definition.fields.forEach((field) => {
      const raw = row[field.name];
      if (field.type === "localizedText" || field.type === "localizedTextarea") {
        const parsed = readLocalized(typeof raw === "string" ? raw : "");
        values[field.name] = typeof parsed === "string" ? { en: parsed } : parsed;
      } else if (raw instanceof Date) {
        values[field.name] = raw.toISOString().slice(0, 10);
      } else {
        values[field.name] = raw ?? (field.type === "boolean" ? false : field.type === "number" ? 0 : "");
      }
    });

    return {
      id: String(row.id),
      values,
      title: plainText(String(row[definition.titleField] ?? "")) || "Untitled",
      subtitle: definition.subtitleField
        ? plainText(String(row[definition.subtitleField] ?? ""))
        : "",
      image: definition.imageField ? String(row[definition.imageField] ?? "") : "",
      isActive: row.isActive !== false,
    };
  });
}
