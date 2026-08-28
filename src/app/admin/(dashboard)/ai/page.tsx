import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { aiKeyHint, isAiConfigured } from "@/lib/ai";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui";
import { AiAssistant } from "@/components/admin/AiAssistant";
import { AiKeyCard } from "@/components/admin/AiKeyCard";

export const metadata: Metadata = { title: "AI Assistant" };

export default async function Page() {
  // Same gate as the route handler behind it: a page that renders is not a
  // page that can call the model.
  const user = await requirePermission("content.edit");
  const [configured, hint] = await Promise.all([isAiConfigured(), aiKeyHint()]);

  // Only a Super Admin may see or replace the credential that pays for this.
  const canManageKey = can(user.role, "advanced.manage");

  return (
    <>
      <PageHeader
        title="AI Assistant"
        description="A writing hand for the website's text: improve a paragraph, translate it, correct it, or draft a social post. It suggests — you decide what goes on the site."
      />
      {canManageKey && (
        <div className="mb-5">
          <AiKeyCard hint={hint} />
        </div>
      )}
      <AiAssistant configured={configured} canManageKey={canManageKey} />
    </>
  );
}
