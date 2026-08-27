import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

/** Listing endpoint used by the media picker. Signed-in users only. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, files: [] }, { status: 401 });

  const query = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  const folder = (request.nextUrl.searchParams.get("folder") ?? "").trim().slice(0, 40);
  const kind = request.nextUrl.searchParams.get("kind") ?? "";

  const files = await db.mediaAsset.findMany({
    where: {
      ...(query ? { originalName: { contains: query } } : {}),
      ...(folder ? { folder } : {}),
      ...(kind === "image" ? { mimeType: { startsWith: "image/" } } : {}),
      ...(kind === "video" ? { mimeType: { startsWith: "video/" } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 120,
    select: {
      id: true,
      url: true,
      originalName: true,
      mimeType: true,
      size: true,
      width: true,
      height: true,
      folder: true,
      alt: true,
    },
  });

  const folders = await db.mediaAsset.findMany({
    distinct: ["folder"],
    select: { folder: true },
    orderBy: { folder: "asc" },
  });

  return NextResponse.json({
    ok: true,
    files,
    folders: folders.map((row) => row.folder),
  });
}
