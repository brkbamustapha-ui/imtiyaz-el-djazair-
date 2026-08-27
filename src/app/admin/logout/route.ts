import { NextResponse, type NextRequest } from "next/server";
import { destroyCurrentSession, getSessionContext } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { verifySameOrigin } from "@/lib/csrf";

/** POST-only so a stray <img> or link cannot sign the user out. */
export async function POST(request: NextRequest) {
  if (!(await verifySameOrigin())) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  const context = await getSessionContext();
  if (context) {
    await logAdminAction({
      userId: context.user.id,
      action: "auth.logout",
      entityType: "user",
      entityId: context.user.id,
    });
  }
  await destroyCurrentSession();
  return NextResponse.redirect(new URL("/admin/login", request.url), { status: 303 });
}
