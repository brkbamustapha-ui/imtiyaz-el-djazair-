"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { slugify, sanitizeRichText } from "@/lib/utils";
import { stringifyJson } from "@/lib/json";
import { fail, ok, sanitiseAssetPath, type ActionResult } from "./_helpers";

const postSchema = z.object({
  title: z.string().trim().min(2, "Give the article a title.").max(180),
  slug: z.string().trim().max(90).optional(),
  type: z.enum(["NEWS", "EVENT"]),
  excerpt: z.string().trim().max(400).optional(),
  content: z.string().max(120_000).optional(),
  category: z.string().trim().max(60).optional(),
  location: z.string().trim().max(120).optional(),
  isPublished: z.boolean(),
  coverUrl: z.string().max(600).optional(),
  eventDate: z.string().optional(),
  seoTitle: z.string().trim().max(160).optional(),
  seoDescription: z.string().trim().max(400).optional(),
  noindex: z.boolean().optional(),
});

export type PostInput = z.infer<typeof postSchema>;

function toDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : new Date(parsed);
}

export async function savePostAction(
  postId: string | null,
  input: Record<string, unknown>,
): Promise<ActionResult> {
  const user = await requirePermission("content.edit").catch(() => null);
  if (!user) return fail("You do not have permission to write articles.");

  const parsed = postSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form.");
  const data = parsed.data;

  // Only an Admin may publish; an Editor can save a draft.
  const canPublish = await requirePermission("content.publish").then(() => true).catch(() => false);
  const isPublished = data.isPublished && canPublish;
  if (data.isPublished && !canPublish) {
    return fail("Editors can save drafts, but only an Admin can publish. Save it unpublished instead.");
  }

  const slug = slugify(data.slug || data.title);
  if (!slug) return fail("That title cannot be turned into a URL — add some letters or numbers.");

  const clash = await db.post.findUnique({ where: { slug } });
  if (clash && clash.id !== postId) return fail(`Another article already uses /news/${slug}.`);

  const payload = {
    slug,
    type: data.type,
    title: data.title,
    excerpt: data.excerpt ?? "",
    content: sanitizeRichText(data.content ?? ""),
    category: data.category || (data.type === "EVENT" ? "Event" : "News"),
    location: data.location ?? "",
    coverUrl: sanitiseAssetPath(data.coverUrl ?? ""),
    isPublished,
    eventDate: data.type === "EVENT" ? toDate(data.eventDate) : null,
    seoJson: stringifyJson({
      title: data.seoTitle ?? "",
      description: data.seoDescription ?? "",
      noindex: Boolean(data.noindex),
    }),
  };

  if (postId) {
    const existing = await db.post.findUnique({ where: { id: postId } });
    if (!existing) return fail("That article no longer exists.");
    await db.post.update({
      where: { id: postId },
      data: {
        ...payload,
        publishedAt: isPublished ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
      },
    });
    await logAdminAction({ userId: user.id, action: "post.updated", entityType: "post", entityId: postId });
    revalidatePath("/", "layout");
    return ok(isPublished ? "Article saved and published." : "Draft saved.", postId);
  }

  const created = await db.post.create({
    data: { ...payload, publishedAt: isPublished ? new Date() : null },
  });
  await logAdminAction({ userId: user.id, action: "post.created", entityType: "post", entityId: created.id });
  revalidatePath("/", "layout");
  return ok(isPublished ? "Article published." : "Draft created.", created.id);
}

export async function togglePostPublishedAction(
  postId: string,
  isPublished: boolean,
): Promise<ActionResult> {
  const user = await requirePermission("content.publish").catch(() => null);
  if (!user) return fail("Only an Admin can publish or unpublish an article.");

  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post) return fail("That article no longer exists.");

  await db.post.update({
    where: { id: postId },
    data: { isPublished, publishedAt: isPublished ? (post.publishedAt ?? new Date()) : post.publishedAt },
  });
  await logAdminAction({
    userId: user.id,
    action: isPublished ? "post.published" : "post.unpublished",
    entityType: "post",
    entityId: postId,
  });
  revalidatePath("/", "layout");
  return ok(isPublished ? "Article published." : "Article unpublished.");
}

export async function deletePostAction(postId: string): Promise<ActionResult> {
  const user = await requirePermission("content.publish").catch(() => null);
  if (!user) return fail("Only an Admin can delete an article.");

  const deleted = await db.post.delete({ where: { id: postId } }).catch(() => null);
  if (!deleted) return fail("That article no longer exists.");

  await logAdminAction({ userId: user.id, action: "post.deleted", entityType: "post", entityId: postId, meta: { slug: deleted.slug } });
  revalidatePath("/", "layout");
  return ok("Article deleted.");
}
