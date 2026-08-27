import "server-only";
import { db } from "./db";
import { clientIp } from "./auth";
import { stringifyJson } from "./json";

/**
 * Administration log. Never record secrets here — pass only identifiers and
 * human-readable labels in `meta`.
 */
export async function logAdminAction(params: {
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        entityType: params.entityType ?? "",
        entityId: params.entityId ?? "",
        metaJson: stringifyJson(params.meta ?? {}),
        ip: await clientIp(),
      },
    });
  } catch {
    // Logging must never break the action it is recording.
  }
}
