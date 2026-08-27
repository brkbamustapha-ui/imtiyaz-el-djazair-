import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { parseJson, stringifyJson } from "@/lib/json";
import { verifyCsrf } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { clientIpFrom } from "@/lib/auth";
import { savePrivateUpload } from "@/lib/upload";
import { validateSubmission, type FormFieldDef } from "@/lib/forms";

export const runtime = "nodejs";

/** Public form endpoint: CSRF-checked, rate-limited and honeypot-protected. */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const ip = clientIpFrom(request.headers);

  const limit = rateLimit(`form:${slug}:${ip}`, 5, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many messages sent. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  if (!(await verifyCsrf(String(formData.get("_csrf") ?? "")))) {
    return NextResponse.json(
      { ok: false, error: "Your session expired. Please reload the page and try again." },
      { status: 403 },
    );
  }

  // Honeypot: real users never fill a hidden field.
  if (String(formData.get("_hp") ?? "").trim() !== "") {
    return NextResponse.json({ ok: true, message: "Thank you." });
  }

  // Timing check: a genuine visitor takes more than 2 seconds to fill a form.
  const startedAt = Number(formData.get("_ts") ?? 0);
  if (Number.isFinite(startedAt) && startedAt > 0 && Date.now() - startedAt < 2000) {
    return NextResponse.json(
      { ok: false, error: "That was too quick — please try again." },
      { status: 400 },
    );
  }

  const form = await db.form.findUnique({ where: { slug } });
  if (!form || !form.isActive) {
    return NextResponse.json({ ok: false, error: "This form is not available." }, { status: 404 });
  }

  const fields = parseJson<FormFieldDef[]>(form.fieldsJson, []);
  const textInput: Record<string, string> = {};
  for (const field of fields) {
    if (field.type === "file") continue;
    const value = formData.get(field.name);
    textInput[field.name] = typeof value === "string" ? value : "";
  }

  const result = validateSubmission(
    fields.filter((field) => field.type !== "file"),
    textInput,
  );
  if (!result.ok) {
    return NextResponse.json({ ok: false, fieldErrors: result.errors }, { status: 422 });
  }

  const payload: Record<string, unknown> = { ...result.value };

  for (const field of fields.filter((item) => item.type === "file")) {
    const file = formData.get(field.name);
    if (!(file instanceof File) || file.size === 0) {
      if (field.required) {
        return NextResponse.json(
          { ok: false, fieldErrors: { [field.name]: "This file is required." } },
          { status: 422 },
        );
      }
      continue;
    }
    const saved = await savePrivateUpload(file);
    if (!saved.ok) {
      return NextResponse.json(
        { ok: false, fieldErrors: { [field.name]: saved.error } },
        { status: 422 },
      );
    }
    payload[field.name] = {
      __attachment: true,
      originalName: file.name.slice(0, 160),
      storedAs: saved.storedAs,
      mimeType: saved.mimeType,
      size: saved.size,
    };
  }

  await db.formSubmission.create({
    data: {
      formId: form.id,
      dataJson: stringifyJson(payload),
      ip,
      userAgent: (request.headers.get("user-agent") ?? "").slice(0, 250),
    },
  });

  return NextResponse.json({ ok: true, message: form.successMessage });
}
