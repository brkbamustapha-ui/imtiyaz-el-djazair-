import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui";
import { PostEditor } from "@/components/admin/PostEditor";

export const metadata: Metadata = { title: "New article" };

export default async function NewPostPage() {
  const user = await requirePermission("content.edit").catch(() => null);
  if (!user) notFound();

  return (
    <>
      <PageHeader title="New article" description="Write a news item or announce an event." />
      <PostEditor
        canPublish={can(user.role, "content.publish")}
        initial={{
          id: null,
          title: "",
          slug: "",
          type: "NEWS",
          excerpt: "",
          content: "",
          category: "News",
          location: "",
          coverUrl: "",
          eventDate: "",
          isPublished: false,
          seoTitle: "",
          seoDescription: "",
          noindex: false,
        }}
      />
    </>
  );
}
