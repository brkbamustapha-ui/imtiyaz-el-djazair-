import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { verifyCsrf } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { logAdminAction } from "@/lib/audit";
import { saveUpload, IMAGE_MIME, DOC_MIME, VIDEO_MIME } from "@/lib/upload";

export const runtime = "nodejs";

/**
 * Media Library upload. Multipart bodies cannot go through a Server Action
 * cleanly, so this route enforces the same guarantees itself: session, role,
 * CSRF, rate limit, and magic-number validation inside `saveUpload`.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  if (!can(user.role, "media.upload")) {
    return NextResponse.json({ ok: false, error: "Not allowed." }, { status: 403 });
  }
  if (!rateLimit(`upload:${user.id}`, 60, 10 * 60 * 1000).allowed) {
    return NextResponse.json({ ok: false, error: "Too many uploads. Wait a moment." }, { status: 429 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid upload." }, { status: 400 });
  }

  if (!(await verifyCsrf(String(formData.get("_csrf") ?? "")))) {
    return NextResponse.json({ ok: false, error: "Session expired — reload the page." }, { status: 403 });
  }

  const folder = String(formData.get("folder") ?? "general");
  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ ok: false, error: "No file received." }, { status: 400 });
  }
  if (files.length > 12) {
    return NextResponse.json({ ok: false, error: "Upload at most 12 files at a time." }, { status: 400 });
  }

  const created: { id: string; url: string; originalName: string }[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const saved = await saveUpload(file, {
      folder,
      allowedMime: [...IMAGE_MIME, ...DOC_MIME, ...VIDEO_MIME],
    });
    if (!saved.ok) {
      errors.push(`${file.name}: ${saved.error}`);
      continue;
    }
    const asset = await db.mediaAsset.create({
      data: {
        filename: saved.file.filename,
        originalName: file.name.slice(0, 200),
        url: saved.file.url,
        mimeType: saved.file.mimeType,
        size: saved.file.size,
        width: saved.file.width ?? null,
        height: saved.file.height ?? null,
        folder: folder.replace(/[^a-z0-9-_]/gi, "").slice(0, 40) || "general",
        uploadedById: user.id,
      },
    });
    created.push({ id: asset.id, url: asset.url, originalName: asset.originalName });
  }

  if (created.length > 0) {
    await logAdminAction({
      userId: user.id,
      action: "media.uploaded",
      entityType: "media",
      meta: { count: created.length, folder },
    });
  }

  return NextResponse.json({
    ok: created.length > 0,
    files: created,
    errors,
  });
}
