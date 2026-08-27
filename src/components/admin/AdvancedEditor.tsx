"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveSettingsAction } from "@/app/admin/actions/settings";
import type { Locale } from "@/lib/i18n";
import { FieldsEditor, type FieldValues } from "./FieldsEditor";
import { Card, Field, Notice, Spinner } from "./ui";
import type { Field as SchemaField } from "@/lib/section-types";

const MAINTENANCE_FIELDS: SchemaField[] = [
  {
    name: "maintenanceMode",
    label: "Maintenance mode",
    type: "boolean",
    help: "Visitors see a holding page. Signed-in admins can still browse the site normally.",
  },
  { name: "maintenanceMessage", label: "Holding page message", type: "localizedTextarea" },
];

export function AdvancedEditor({
  initial,
  locales,
  scriptsAllowed,
}: {
  initial: FieldValues;
  locales: Locale[];
  scriptsAllowed: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState<FieldValues>(initial);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      const result = await saveSettingsAction("advanced", values);
      setMessage({ ok: result.ok, text: result.message });
      router.refresh();
    });
  };

  const set = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));

  return (
    <div className="space-y-5">
      <Card title="Maintenance">
        <div className="p-5">
          <FieldsEditor
            fields={MAINTENANCE_FIELDS}
            values={values}
            onChange={setValues}
            locales={locales}
          />
        </div>
      </Card>

      <Card
        title="Custom CSS"
        description="Injected into every page of the public site. Use it to fine-tune spacing or override a style."
      >
        <div className="p-5">
          <Field label="CSS" htmlFor="custom-css">
            <textarea
              id="custom-css"
              className="a-textarea font-[ui-monospace] text-[0.8rem]"
              rows={12}
              spellCheck={false}
              value={String(values.customCss ?? "")}
              onChange={(event) => set("customCss", event.target.value)}
              placeholder={".hero-title { letter-spacing: -0.03em; }"}
            />
          </Field>
          <p className="a-help">
            Closing <code className="a-mono">&lt;/style&gt;</code> and{" "}
            <code className="a-mono">&lt;/script&gt;</code> tags are stripped on save so the block
            cannot be escaped.
          </p>
        </div>
      </Card>

      <Card
        title="Custom scripts"
        description="Analytics snippets, chat widgets and similar third-party tags."
      >
        <div className="space-y-4 p-5">
          {!scriptsAllowed && (
            <Notice tone="warn">
              Saving script content is rejected by the server while{" "}
              <code className="a-mono">ALLOW_CUSTOM_SCRIPTS</code> is not <code className="a-mono">true</code>.
            </Notice>
          )}
          <Field
            label="Head scripts"
            htmlFor="head-scripts"
            help="Runs inside <head>, before the page renders."
          >
            <textarea
              id="head-scripts"
              className="a-textarea font-[ui-monospace] text-[0.8rem]"
              rows={6}
              spellCheck={false}
              disabled={!scriptsAllowed}
              value={String(values.headScripts ?? "")}
              onChange={(event) => set("headScripts", event.target.value)}
            />
          </Field>
          <Field
            label="Body-end scripts"
            htmlFor="body-scripts"
            help="Runs after the page has rendered. Prefer this for anything non-critical."
          >
            <textarea
              id="body-scripts"
              className="a-textarea font-[ui-monospace] text-[0.8rem]"
              rows={6}
              spellCheck={false}
              disabled={!scriptsAllowed}
              value={String(values.bodyEndScripts ?? "")}
              onChange={(event) => set("bodyEndScripts", event.target.value)}
            />
          </Field>
        </div>
      </Card>

      {message && <Notice tone={message.ok ? "success" : "danger"}>{message.text}</Notice>}

      <button type="button" className="a-btn a-btn-primary" onClick={save} disabled={pending}>
        {pending && <Spinner />}
        Save advanced settings
      </button>
    </div>
  );
}
