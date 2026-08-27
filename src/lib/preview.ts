import "server-only";
import { cookies } from "next/headers";
import { getCurrentUser } from "./auth";

export const PREVIEW_COOKIE = "ied_preview";

/**
 * Preview mode renders section DRAFTS instead of published content.
 * It is only honoured for a signed-in admin user, so an unpublished draft can
 * never leak to the public through a shared link.
 */
export async function isPreviewMode(): Promise<boolean> {
  const cookieStore = await cookies();
  if (cookieStore.get(PREVIEW_COOKIE)?.value !== "1") return false;
  return (await getCurrentUser()) !== null;
}
