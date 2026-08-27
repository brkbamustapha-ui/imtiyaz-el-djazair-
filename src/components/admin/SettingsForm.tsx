"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveSettingsAction } from "@/app/admin/actions/settings";
import type { Field } from "@/lib/section-types";
import type { Locale } from "@/lib/i18n";
import { LOCALES, LOCALE_META } from "@/lib/i18n";
import { FieldsEditor, type FieldValues } from "./FieldsEditor";
import { LanguagePicker } from "./LanguagePicker";
import { Card, Notice, Spinner } from "./ui";

/**
 * Generic settings form. The bucket key decides which server-side sanitiser
 * runs, so no client can widen what a settings section is allowed to store.
 */
export function SettingsForm({
  settingsKey,
  fields,
  initial,
  locales,
  title,
  description,
  withLanguagePicker = false,
}: {
  settingsKey: string;
  fields: Field[];
  initial: FieldValues;
  locales: Locale[];
  title?: string;
  description?: string;
  /** Renders the enabled-languages control above the schema fields. */
  withLanguagePicker?: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState<FieldValues>(initial);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      const result = await saveSettingsAction(settingsKey, values);
      setMessage({ ok: result.ok, text: result.message });
      router.refresh();
    });
  };

  return (
    <Card title={title} description={description}>
      <div className="space-y-6 p-5">
        {withLanguagePicker && (
          <LanguagePicker
            all={[...LOCALES]}
            meta={LOCALE_META}
            enabled={(values.enabledLocales as string[]) ?? ["en"]}
            defaultLocale={String(values.defaultLocale ?? "en")}
            onChange={(enabledLocales, defaultLocale) =>
              setValues((current) => ({ ...current, enabledLocales, defaultLocale }))
            }
          />
        )}
        <FieldsEditor fields={fields} values={values} onChange={setValues} locales={locales} />
        {message && <Notice tone={message.ok ? "success" : "danger"}>{message.text}</Notice>}
        <div>
          <button type="button" className="a-btn a-btn-primary" onClick={save} disabled={pending}>
            {pending && <Spinner />}
            Save changes
          </button>
        </div>
      </div>
    </Card>
  );
}
