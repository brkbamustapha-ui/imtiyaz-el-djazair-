import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { parseJson } from "@/lib/json";
import { isLocale, type Locale } from "@/lib/i18n";
import { DEFAULT_CONTACT_FIELDS, type FormFieldDef } from "@/lib/forms";
import { PageHeader } from "@/components/admin/ui";
import { FormBuilder } from "@/components/admin/FormBuilder";

export const metadata: Metadata = { title: "Form builder" };

export default async function FormEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("forms.manage").catch(() => null);
  if (!user) notFound();

  const { id } = await params;
  const general = await getSetting("general");
  const locales = general.enabledLocales.filter(isLocale) as Locale[];
  const isNew = id === "new";

  const form = isNew ? null : await db.form.findUnique({ where: { id } });
  if (!isNew && !form) notFound();

  return (
    <>
      <PageHeader
        title={isNew ? "New form" : `Edit: ${form!.name}`}
        description="Add the fields you need. Responses appear in Forms & Messages."
      />
      <FormBuilder
        locales={locales.length > 0 ? locales : ["en"]}
        canDelete={!isNew && form!.slug !== "contact"}
        initial={{
          id: form?.id ?? null,
          name: form?.name ?? "New form",
          slug: form?.slug ?? "",
          successMessage: form?.successMessage ?? "Thank you! We will get back to you shortly.",
          notifyEmail: form?.notifyEmail ?? "",
          isActive: form?.isActive ?? true,
          fields: form
            ? parseJson<FormFieldDef[]>(form.fieldsJson, DEFAULT_CONTACT_FIELDS)
            : DEFAULT_CONTACT_FIELDS,
        }}
      />
    </>
  );
}
