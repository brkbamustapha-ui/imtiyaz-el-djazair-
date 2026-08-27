"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { stringifyJson } from "@/lib/json";
import { slugify } from "@/lib/utils";
import { formFieldsSchema, RESERVED_FIELD_NAMES } from "@/lib/forms";
import { fail, ok, type ActionResult } from "./_helpers";

const formSchema = z.object({
  name: z.string().trim().min(2, "Give the form a name.").max(80),
  slug: z.string().trim().max(60).optional(),
  successMessage: z.string().trim().max(400),
  notifyEmail: z.string().trim().max(160).optional(),
  isActive: z.boolean(),
});

export async function saveFormAction(
  formId: string | null,
  input: Record<string, unknown>,
  fields: unknown,
): Promise<ActionResult> {
  const user = await requirePermission("forms.manage").catch(() => null);
  if (!user) return fail("You do not have permission to change forms.");

  const parsed = formSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form.");

  const parsedFields = formFieldsSchema.safeParse(fields);
  if (!parsedFields.success) {
    return fail(`One of the fields is not valid: ${parsedFields.error.issues[0]?.message ?? ""}`);
  }
  if (parsedFields.data.length === 0) return fail("A form needs at least one field.");

  const names = parsedFields.data.map((field) => field.name);
  if (new Set(names).size !== names.length) return fail("Two fields share the same name.");
  const reserved = names.find((name) => RESERVED_FIELD_NAMES.includes(name));
  if (reserved) return fail(`“${reserved}” is a reserved field name.`);

  const slug = slugify(parsed.data.slug || parsed.data.name);
  if (!slug) return fail("The form needs a URL-safe name.");

  const clash = await db.form.findUnique({ where: { slug } });
  if (clash && clash.id !== formId) return fail(`Another form already uses the name “${slug}”.`);

  const payload = {
    slug,
    name: parsed.data.name,
    successMessage: parsed.data.successMessage,
    notifyEmail: parsed.data.notifyEmail ?? "",
    isActive: parsed.data.isActive,
    fieldsJson: stringifyJson(parsedFields.data),
  };

  if (formId) {
    const updated = await db.form.update({ where: { id: formId }, data: payload }).catch(() => null);
    if (!updated) return fail("That form no longer exists.");
    await logAdminAction({ userId: user.id, action: "form.updated", entityType: "form", entityId: formId });
    revalidatePath("/", "layout");
    return ok("Form saved.", formId);
  }

  const created = await db.form.create({ data: payload });
  await logAdminAction({ userId: user.id, action: "form.created", entityType: "form", entityId: created.id });
  revalidatePath("/", "layout");
  return ok("Form created.", created.id);
}

export async function deleteFormAction(formId: string): Promise<ActionResult> {
  const user = await requirePermission("forms.manage").catch(() => null);
  if (!user) return fail("Not allowed.");

  const form = await db.form.findUnique({ where: { id: formId } });
  if (!form) return fail("That form no longer exists.");
  if (form.slug === "contact") return fail("The contact form is used by the contact section and cannot be deleted.");

  await db.form.delete({ where: { id: formId } });
  await logAdminAction({ userId: user.id, action: "form.deleted", entityType: "form", entityId: formId });
  revalidatePath("/", "layout");
  return ok("Form deleted along with its submissions.");
}

export async function markSubmissionAction(
  submissionId: string,
  patch: { isRead?: boolean; isArchived?: boolean },
): Promise<ActionResult> {
  const user = await requirePermission("forms.view_submissions").catch(() => null);
  if (!user) return fail("Not allowed.");

  const updated = await db.formSubmission
    .update({ where: { id: submissionId }, data: patch })
    .catch(() => null);
  if (!updated) return fail("That message no longer exists.");

  revalidatePath("/admin/forms");
  return ok("Updated.");
}

export async function deleteSubmissionAction(submissionId: string): Promise<ActionResult> {
  const user = await requirePermission("forms.view_submissions").catch(() => null);
  if (!user) return fail("Not allowed.");

  const deleted = await db.formSubmission.delete({ where: { id: submissionId } }).catch(() => null);
  if (!deleted) return fail("That message no longer exists.");

  await logAdminAction({ userId: user.id, action: "submission.deleted", entityType: "submission", entityId: submissionId });
  revalidatePath("/admin/forms");
  return ok("Message deleted.");
}

export async function markAllReadAction(formId: string): Promise<ActionResult> {
  const user = await requirePermission("forms.view_submissions").catch(() => null);
  if (!user) return fail("Not allowed.");

  const result = await db.formSubmission.updateMany({
    where: { formId, isRead: false },
    data: { isRead: true },
  });
  revalidatePath("/admin/forms");
  return ok(`${result.count} message${result.count === 1 ? "" : "s"} marked as read.`);
}
