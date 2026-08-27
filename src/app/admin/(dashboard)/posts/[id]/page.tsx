import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { parsePageSeo } from "@/lib/seo";
import { PageHeader } from "@/components/admin/ui";
import { PostEditor } from "@/components/admin/PostEditor";

export const metadata: Metadata = { title: "Edit article" };

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("content.edit").catch(() => null);
  if (!user) notFound();

  const { id } = await params;
  const post = await db.post.findUnique({ where: { id } });
  if (!post) notFound();

  const seo = parsePageSeo(post.seoJson);

  return (
    <>
      <PageHeader title="Edit article" description={post.title} />
      <PostEditor
        canPublish={can(user.role, "content.publish")}
        initial={{
          id: post.id,
          title: post.title,
          slug: post.slug,
          type: post.type === "EVENT" ? "EVENT" : "NEWS",
          excerpt: post.excerpt,
          content: post.content,
          category: post.category,
          location: post.location,
          coverUrl: post.coverUrl,
          eventDate: post.eventDate ? post.eventDate.toISOString().slice(0, 10) : "",
          isPublished: post.isPublished,
          seoTitle: seo.title ?? "",
          seoDescription: seo.description ?? "",
          noindex: Boolean(seo.noindex),
        }}
      />
    </>
  );
}
