import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui";
import { MediaLibrary } from "@/components/admin/MediaLibrary";

export const metadata: Metadata = { title: "Media Library" };

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string; q?: string }>;
}) {
  const user = await requirePermission("media.upload").catch(() => null);
  if (!user) notFound();

  const { folder, q } = await searchParams;
  const query = (q ?? "").trim().slice(0, 80);

  const [assets, folderRows, totalSize] = await Promise.all([
    db.mediaAsset.findMany({
      where: {
        ...(folder ? { folder } : {}),
        ...(query ? { originalName: { contains: query } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { uploadedBy: { select: { name: true } } },
    }),
    db.mediaAsset.findMany({ distinct: ["folder"], select: { folder: true }, orderBy: { folder: "asc" } }),
    db.mediaAsset.aggregate({ _sum: { size: true }, _count: true }),
  ]);

  return (
    <>
      <PageHeader
        title="Media Library"
        description="Every image, video and PDF used on the website. Files are checked on upload and large images are automatically resized."
      />
      <MediaLibrary
        assets={assets.map((asset) => ({
          id: asset.id,
          url: asset.url,
          originalName: asset.originalName,
          mimeType: asset.mimeType,
          size: asset.size,
          width: asset.width,
          height: asset.height,
          folder: asset.folder,
          alt: asset.alt,
          uploadedBy: asset.uploadedBy?.name ?? "—",
          createdAt: asset.createdAt.toISOString(),
        }))}
        folders={folderRows.map((row) => row.folder)}
        activeFolder={folder ?? ""}
        query={query}
        totalCount={totalSize._count}
        totalBytes={totalSize._sum.size ?? 0}
        canDelete={can(user.role, "media.delete")}
      />
    </>
  );
}
