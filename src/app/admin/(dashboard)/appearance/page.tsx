import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { PageHeader } from "@/components/admin/ui";
import { AppearanceEditor } from "@/components/admin/AppearanceEditor";

export const metadata: Metadata = { title: "Appearance" };

export default async function AppearancePage() {
  const user = await requirePermission("appearance.manage").catch(() => null);
  if (!user) notFound();

  const appearance = await getSetting("appearance");

  return (
    <>
      <PageHeader
        title="Appearance"
        description="Colours, typography, corner radius and motion for the public website. The admin panel keeps its own theme so it always stays readable."
      />
      <AppearanceEditor initial={appearance} />
    </>
  );
}
