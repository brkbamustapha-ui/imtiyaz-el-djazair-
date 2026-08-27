import { createReadStream, statSync } from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Serves runtime media (Media Library uploads and brand artwork).
 *
 * These files CANNOT live in /public: `next start` serves that directory from a
 * manifest built at compile time, so anything written afterwards is invisible.
 * They are stored under ./storage/media and streamed from here instead.
 */
const MEDIA_ROOT = path.resolve(process.cwd(), "storage", "media");

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

  const target = path.resolve(MEDIA_ROOT, ...segments);
  if (target !== MEDIA_ROOT && !target.startsWith(MEDIA_ROOT + path.sep)) {
    return new NextResponse("Not found", { status: 404 });
  }

  let size: number;
  try {
    const stats = statSync(target);
    if (!stats.isFile()) return new NextResponse("Not found", { status: 404 });
    size = stats.size;
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const extension = path.extname(target).toLowerCase();
  const contentType = CONTENT_TYPE[extension];
  if (!contentType) return new NextResponse("Not found", { status: 404 });

  const stream = Readable.toWeb(createReadStream(target)) as ReadableStream;

  return new NextResponse(stream, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(size),
      // Filenames are content-addressed, so they can be cached hard.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}
