"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { saveAiKey } from "@/lib/ai";
import { fail, ok, type ActionResult } from "./_helpers";

/**
 * Saves (or clears) the Anthropic API key from Admin -> AI Assistant.
 *
 * Gated on `advanced.manage`, which only a Super Admin holds: an editor can use
 * the assistant but must not be able to read or replace the credential that
 * pays for it. The key itself is never logged — the audit entry records that a
 * key was set, not what it was.
 */
export async function saveAiKeyAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requirePermission("advanced.manage");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Not allowed.");
  }

  const raw = String(formData.get("apiKey") ?? "").trim();

  if (raw && raw.length < 20) {
    return fail("That does not look like an API key. Paste the whole value.");
  }

  await saveAiKey(raw);
  await logAdminAction({
    action: raw ? "ai.key.set" : "ai.key.cleared",
    entityType: "settings",
    entityId: "ai",
  });
  revalidatePath("/admin/ai");

  return ok(raw ? "API key saved. The assistant is ready." : "API key removed.");
}
