import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { clientIpFrom } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * Minimal first-party page-view counter for the admin dashboard.
 * Stores a random per-browser key only — no IP, no cookies, no third party.
 */
export async function POST(request: NextRequest) {
  const ip = clientIpFrom(request.headers);
  if (!rateLimit(`track:${ip}`, 60, 60_000).allowed) {
    return NextResponse.json({ ok: true });
  }

  let body: { path?: string; referrer?: string; key?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const path = (body.path ?? "/").slice(0, 200);
  if (path.startsWith("/admin")) return NextResponse.json({ ok: true });

  await db.visitEvent
    .create({
      data: {
        path,
        referrer: (body.referrer ?? "").slice(0, 200),
        visitorKey: (body.key ?? "anon").slice(0, 64),
      },
    })
    .catch(() => undefined);

  return NextResponse.json({ ok: true });
}
