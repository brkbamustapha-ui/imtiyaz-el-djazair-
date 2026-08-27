import { NextResponse, type NextRequest } from "next/server";
import { PREVIEW_COOKIE } from "@/lib/preview";
import { getCurrentUser } from "@/lib/auth";

/** Only a signed-in admin can turn preview mode on. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const target = request.nextUrl.searchParams.get("path") ?? "/";
  const safeTarget = target.startsWith("/") && !target.startsWith("//") ? target : "/";

  const response = NextResponse.redirect(new URL(safeTarget, request.url));
  response.cookies.set(PREVIEW_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60,
  });
  return response;
}
