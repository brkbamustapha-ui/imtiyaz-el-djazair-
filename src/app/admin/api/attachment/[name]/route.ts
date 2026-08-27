import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";

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
 * Files attached to a public form submission live outside /public. They are
 * only readable by a signed-in user who may view submissions, and are always
 * sent as a download so nothing is ever rendered inline from user input.
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

  const directory = path.resolve(process.cwd(), "storage", "submissions");
  const target = path.resolve(directory, name);
  if (!target.startsWith(directory + path.sep)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const data = await readFile(target).catch(() => null);
  if (!data) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": MIME_BY_EXT[path.extname(name).toLowerCase()] ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${name}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
