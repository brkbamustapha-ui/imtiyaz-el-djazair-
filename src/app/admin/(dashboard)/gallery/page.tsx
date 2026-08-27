import type { Metadata } from "next";
import { CollectionPage } from "@/components/admin/CollectionPage";

export const metadata: Metadata = { title: "Gallery" };

export default function Page() {
  return (
    <CollectionPage
      collection="gallery"
      notice="The photos supplied with this build are abstract placeholders, not pictures of the school. Replace each one with a real photo before going live."
    />
  );
}
