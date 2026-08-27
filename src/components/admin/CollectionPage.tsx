import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getSetting } from "@/lib/settings";
import { isLocale, type Locale } from "@/lib/i18n";
import { COLLECTIONS, type CollectionKey } from "@/lib/collections";
import { loadCollection } from "@/server/admin-collections";
import { CollectionManager } from "./CollectionManager";
import { PageHeader } from "./ui";

/**
 * Every content collection page is this component with a different key —
 * the list, editor and validation all come from the collection definition.
 */
export async function CollectionPage({
  collection,
  notice,
}: {
  collection: CollectionKey;
  notice?: string;
}) {
  const definition = COLLECTIONS[collection];
  const user = await requirePermission(definition.permission).catch(() => null);
  if (!user) notFound();

  const [rows, general] = await Promise.all([loadCollection(collection), getSetting("general")]);
  const locales = general.enabledLocales.filter(isLocale) as Locale[];

  return (
    <>
      <PageHeader title={definition.label} description={definition.description} />
      <CollectionManager
        definition={definition}
        rows={rows}
        locales={locales.length > 0 ? locales : ["en"]}
        readOnly={!can(user.role, definition.permission)}
        notice={notice}
      />
    </>
  );
}
