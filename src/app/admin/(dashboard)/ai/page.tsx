import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { isAiConfigured } from "@/lib/ai";
import { PageHeader } from "@/components/admin/ui";
import { AiAssistant } from "@/components/admin/AiAssistant";

export const metadata: Metadata = { title: "AI Assistant" };

export default async function Page() {
  // Same gate as the route handler behind it: a page that renders is not a
  // page that can call the model.
  await requirePermission("content.edit");

  return (
    <>
      <PageHeader
        title="AI Assistant"
        description="A writing hand for the website's text: improve a paragraph, translate it, correct it, or draft a social post. It suggests — you decide what goes on the site."
      />
      <AiAssistant configured={isAiConfigured()} />
    </>
  );
}
