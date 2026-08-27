import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getFile } from "@/lib/storage";
import { SUBMISSION_FOLDER } from "@/lib/upload";

export const runtime = "nodejs";

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

/**
 * Files attached to a public form submission are stored private, so /media
 * refuses them. They are only readable by a signed-in user who may view
 * submissions, and are always sent as a download so nothing is ever rendered
 * inline from user input.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ name: string }> },
) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "forms.view_submissions")) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { name } = await context.params;
  // Reject anything that is not one of our generated filenames.
  if (!/^[a-z0-9]+-[a-f0-9]{20}\.[a-z0-9]{2,5}$/i.test(name)) {
    return new NextResponse("Not found", { status: 404 });
  }

  // `true` demands a private row: a Media Library file can never be fetched here.
  const blob = await getFile(`${SUBMISSION_FOLDER}/${name}`, true);
  if (!blob) return new NextResponse("Not found", { status: 404 });

  const dot = name.lastIndexOf(".");
  const extension = dot === -1 ? "" : name.slice(dot).toLowerCase();

  return new NextResponse(new Uint8Array(blob.data), {
    headers: {
      "Content-Type": MIME_BY_EXT[extension] ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${name}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
