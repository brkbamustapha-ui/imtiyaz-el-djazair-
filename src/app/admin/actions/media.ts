"use server";

import { unlink } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { MEDIA_ROOT } from "@/lib/upload";
import { fail, ok, type ActionResult } from "./_helpers";

/** Only ever unlink inside the media root, whatever the stored URL says. */
async function removeFile(url: string) {
  if (!url.startsWith("/media/")) return;
  const root = path.resolve(MEDIA_ROOT);
  const resolved = path.resolve(root, url.slice("/media/".length));
  if (!resolved.startsWith(root + path.sep)) return;
  await unlink(resolved).catch(() => undefined);
}

export async function deleteMediaAction(id: string): Promise<ActionResult> {
  const user = await requirePermission("media.delete").catch(() => null);
  if (!user) return fail("You do not have permission to delete files.");

  const asset = await db.mediaAsset.findUnique({ where: { id } });
  if (!asset) return fail("That file no longer exists.");

  await removeFile(asset.url);
  await db.mediaAsset.delete({ where: { id } });
  await logAdminAction({ userId: user.id, action: "media.deleted", entityType: "media", entityId: id, meta: { url: asset.url } });
  revalidatePath("/admin/media");
  return ok("File deleted. Anywhere it was used will now show a broken image.");
}

export async function updateMediaAction(
  id: string,
  input: { alt: string; folder: string; originalName: string },
): Promise<ActionResult> {
  const user = await requirePermission("media.upload").catch(() => null);
  if (!user) return fail("Not allowed.");

  const updated = await db.mediaAsset
    .update({
      where: { id },
      data: {
        alt: input.alt.slice(0, 240),
        folder: (input.folder || "general").replace(/[^a-z0-9-_]/gi, "").slice(0, 40) || "general",
        originalName: input.originalName.slice(0, 200),
      },
    })
    .catch(() => null);
  if (!updated) return fail("That file no longer exists.");

  revalidatePath("/admin/media");
  return ok("File details saved.");
}
