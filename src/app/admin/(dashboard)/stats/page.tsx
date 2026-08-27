import type { Metadata } from "next";
import { CollectionPage } from "@/components/admin/CollectionPage";

export const metadata: Metadata = { title: "Statistics" };

export default function Page() {
  return <CollectionPage collection="stats" />;
}
