import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { verifySameOrigin } from "@/lib/csrf";
import { can } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { isAiTask, runAiTask } from "@/lib/ai";

export const runtime = "nodejs";
// Adaptive thinking makes the round trip longer than a database query; 60s is
// well inside Vercel's ceiling and far more than a paragraph rewrite needs.
export const maxDuration = 60;

const BodySchema = z.object({
  task: z.string().min(1).max(40),
  text: z.string().max(12_000),
  instruction: z.string().max(600).optional(),
});

const ERRORS: Record<string, { status: number; message: string }> = {
  not_configured: {
    status: 503,
    message:
      "The AI assistant is not configured yet. Add ANTHROPIC_API_KEY to the environment variables and redeploy.",
  },
  bad_key: { status: 502, message: "ANTHROPIC_API_KEY was rejected. Check the key." },
  rate_limited: { status: 429, message: "The AI provider is rate limiting. Try again shortly." },
  refused: { status: 422, message: "The assistant declined to answer that request." },
  missing_instruction: { status: 400, message: "Write what you want the assistant to do." },
  empty: { status: 502, message: "The assistant returned nothing. Try again." },
  network: { status: 502, message: "Could not reach the AI provider." },
};

/**
 * The only door between the browser and the model.
 *
 * Everything the key could be abused for is gated here: you must hold a valid
 * admin session, have `content.edit`, and be on our own origin — and even then
 * you get 20 requests per 5 minutes, so a compromised editor account cannot run
 * up a bill.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }
  if (!can(user.role, "content.edit")) {
    return NextResponse.json({ ok: false, error: "Not allowed." }, { status: 403 });
  }
  if (!(await verifySameOrigin())) {
    return NextResponse.json({ ok: false, error: "Bad origin." }, { status: 403 });
  }

  const limit = rateLimit(`ai:${user.id}`, 20, 5 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: `Too many requests. Try again in ${limit.retryAfterSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const { task, text, instruction } = parsed.data;
  if (!isAiTask(task)) {
    return NextResponse.json({ ok: false, error: "Unknown task." }, { status: 400 });
  }
  if (!text.trim() && task !== "custom") {
    return NextResponse.json({ ok: false, error: "Paste some text first." }, { status: 400 });
  }

  const result = await runAiTask({ task, text, instruction });
  if (result.ok) {
    return NextResponse.json({ ok: true, text: result.text });
  }

  const mapped = ERRORS[result.error] ?? { status: 502, message: "The assistant failed." };
  return NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status });
}
