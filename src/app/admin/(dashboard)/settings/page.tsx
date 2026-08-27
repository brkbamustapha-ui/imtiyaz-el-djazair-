import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getAllSettings } from "@/lib/settings";
import { isLocale, type Locale } from "@/lib/i18n";
import { CONTACT_FIELDS, GENERAL_FIELDS, SOCIAL_FIELDS } from "@/lib/settings-fields";
import { PageHeader } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/SettingsForm";

export const metadata: Metadata = { title: "Site settings" };

export default async function SettingsPage() {
  const user = await requirePermission("seo.manage").catch(() => null);
  if (!user) notFound();

  const settings = await getAllSettings();
  const locales = settings.general.enabledLocales.filter(isLocale) as Locale[];
  const editorLocales = locales.length > 0 ? locales : (["en"] as Locale[]);

  return (
    <>
      <PageHeader
        title="Site settings"
        description="The school's name, branding, contact details and social links. Everything here appears on the public website."
      />

      <div className="space-y-5">
        <SettingsForm
          settingsKey="general"
          title="General"
          fields={GENERAL_FIELDS}
          initial={settings.general as unknown as Record<string, unknown>}
          locales={editorLocales}
          withLanguagePicker
        />

        <SettingsForm
          settingsKey="contact"
          title="Contact details"
          description="Used by the contact section, the footer and the Schema.org data."
          fields={CONTACT_FIELDS}
          initial={settings.contact as unknown as Record<string, unknown>}
          locales={editorLocales}
        />

        <SettingsForm
          settingsKey="social"
          title="Social media"
          description="Leave a field empty to hide that icon."
          fields={SOCIAL_FIELDS}
          initial={settings.social as unknown as Record<string, unknown>}
          locales={editorLocales}
        />
      </div>
    </>
  );
}
