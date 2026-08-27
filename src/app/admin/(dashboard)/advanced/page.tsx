import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getAllSettings } from "@/lib/settings";
import { isLocale, type Locale } from "@/lib/i18n";
import { Notice, PageHeader } from "@/components/admin/ui";
import { AdvancedEditor } from "@/components/admin/AdvancedEditor";

export const metadata: Metadata = { title: "Advanced" };

export default async function AdvancedPage() {
  // Super Admin only — `advanced.manage` is granted to no other role.
  const user = await requirePermission("advanced.manage").catch(() => null);
  if (!user) notFound();

  const settings = await getAllSettings();
  const locales = settings.general.enabledLocales.filter(isLocale) as Locale[];
  const scriptsAllowed = process.env.ALLOW_CUSTOM_SCRIPTS === "true";

  return (
    <>
      <PageHeader
        title="Advanced"
        description="Maintenance mode, custom CSS and — if the server allows it — custom scripts."
      />

      <div className="mb-5 space-y-3">
        <Notice tone="danger">
          <strong>Everything on this page runs in your visitors&apos; browsers.</strong> A mistake
          here can break the site or, with scripts enabled, expose visitors to injected code. Only a
          Super Admin can open this page.
        </Notice>
        {!scriptsAllowed && (
          <Notice tone="info">
            Custom scripts are switched off at the server. To enable them, set{" "}
            <code className="a-mono">ALLOW_CUSTOM_SCRIPTS=true</code> in the environment and restart.
            Custom CSS works either way.
          </Notice>
        )}
      </div>

      <AdvancedEditor
        initial={settings.advanced as unknown as Record<string, unknown>}
        locales={locales.length > 0 ? locales : ["en"]}
        scriptsAllowed={scriptsAllowed}
      />
    </>
  );
}
