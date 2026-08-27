import { NextResponse, type NextRequest } from "next/server";
import { getFile } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Serves media uploaded from the dashboard (Media Library, brand artwork).
 *
 * The bytes come from the database, not from disk — see src/lib/storage.ts for
 * why. Private form attachments are stored too but are never served here: the
 * `false` passed to getFile makes a private row read as missing.
 */
const CONTENT_TYPE: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await context.params;

  // Reject traversal and anything that is not a plain path segment.
  if (
    !segments?.length ||
    segments.length > 4 ||
    segments.some((segment) => !/^[A-Za-z0-9._-]{1,120}$/.test(segment) || segment.startsWith("."))
  ) {
    return new NextResponse("Not found", { status: 404 });
  }

  const key = segments.join("/");
  const dot = key.lastIndexOf(".");
  const extension = dot === -1 ? "" : key.slice(dot).toLowerCase();

  // Serve only media types, whatever the row happens to claim.
  const contentType = CONTENT_TYPE[extension];
  if (!contentType) return new NextResponse("Not found", { status: 404 });

  const blob = await getFile(key, false);
  if (!blob) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(blob.data), {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(blob.size),
      // Filenames are content-addressed, so they can be cached hard. This also
      // keeps the database out of the path: the CDN answers after the first hit.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}
