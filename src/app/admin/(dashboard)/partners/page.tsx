import type { Metadata } from "next";
import { CollectionPage } from "@/components/admin/CollectionPage";

export const metadata: Metadata = { title: "Partners & Logos" };

export default function Page() {
  return (
    <CollectionPage
      collection="partners"
      notice="The bundled partner logos are typographic placeholders, not the official marks. Upload the official artwork you have permission to display, and only tick “relationship confirmed” once you hold that confirmation in writing."
    />
  );
}
