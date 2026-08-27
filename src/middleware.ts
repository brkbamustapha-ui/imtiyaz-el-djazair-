import { NextResponse, type NextRequest } from "next/server";

const CSRF_COOKIE = "ied_csrf";
const SESSION_COOKIE = "ied_session";

/** Web Crypto — middleware runs on the Edge runtime, so no node:crypto here. */
function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Cheap gate for the admin area. The real authorisation check happens in the
  // admin layout and again inside every server action — this only saves a
  // pointless render for visitors who obviously are not signed in.
  if (
    pathname.startsWith("/admin") &&
    !pathname.startsWith("/admin/login") &&
    !pathname.startsWith("/admin/forgot-password") &&
    !pathname.startsWith("/admin/reset-password") &&
    !request.cookies.has(SESSION_COOKIE)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = pathname === "/admin" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  // Issue the CSRF token used by public forms and admin uploads.
  const existing = request.cookies.get(CSRF_COOKIE)?.value;
  if (existing) return NextResponse.next();

  const token = randomToken();
  request.cookies.set(CSRF_COOKIE, token);
  const response = NextResponse.next({ request: { headers: request.headers } });
  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: false, // the browser must echo it back in the request body
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and image optimisation.
    "/((?!_next/static|_next/image|favicon.ico|uploads/|assets/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|mp4|webm|txt|xml)$).*)",
  ],
};
