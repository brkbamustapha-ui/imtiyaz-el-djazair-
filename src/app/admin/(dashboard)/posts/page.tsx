import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui";
import { PostsTable } from "@/components/admin/PostsTable";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "News & Events" };

export default async function PostsPage() {
  const user = await requirePermission("content.edit").catch(() => null);
  if (!user) notFound();

  const posts = await db.post.findMany({
    orderBy: [{ isPublished: "asc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  return (
    <>
      <PageHeader
        title="News & Events"
        description="Articles and events shown on /news and in every “News & Events” section."
        actions={
          <Link href="/admin/posts/new" className="a-btn a-btn-primary">
            <Icon name="plus" size={15} />
            New article
          </Link>
        }
      />
      <PostsTable
        posts={posts.map((post) => ({
          id: post.id,
          slug: post.slug,
          title: post.title,
          type: post.type,
          category: post.category,
          isPublished: post.isPublished,
          publishedAt: post.publishedAt?.toISOString() ?? null,
          eventDate: post.eventDate?.toISOString() ?? null,
          coverUrl: post.coverUrl,
        }))}
        canPublish={can(user.role, "content.publish")}
      />
    </>
  );
}
