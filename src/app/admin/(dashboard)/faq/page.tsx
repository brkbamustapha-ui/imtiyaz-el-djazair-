import type { Metadata } from "next";
import { CollectionPage } from "@/components/admin/CollectionPage";

export const metadata: Metadata = { title: "FAQ" };

export default function Page() {
  return <CollectionPage collection="faq" />;
}
