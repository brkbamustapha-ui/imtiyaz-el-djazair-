import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getAllSettings } from "@/lib/settings";
import { isLocale, type Locale } from "@/lib/i18n";
import { FOOTER_FIELDS } from "@/lib/settings-fields";
import { PageHeader } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/SettingsForm";

export const metadata: Metadata = { title: "Footer" };

export default async function FooterPage() {
  const user = await requirePermission("navigation.manage").catch(() => null);
  if (!user) notFound();

  const settings = await getAllSettings();
  const locales = settings.general.enabledLocales.filter(isLocale) as Locale[];

  return (
    <>
      <PageHeader
        title="Footer"
        description="Columns, links and the bottom bar. Contact details and social icons come from Site settings."
      />
      <SettingsForm
        settingsKey="footer"
        fields={FOOTER_FIELDS}
        initial={settings.footer as unknown as Record<string, unknown>}
        locales={locales.length > 0 ? locales : ["en"]}
      />
    </>
  );
}
