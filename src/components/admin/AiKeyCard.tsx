"use client";

import { useActionState } from "react";
import { saveAiKeyAction } from "@/app/admin/actions/ai";
import { Card, FormMessage, SubmitButton } from "./ui";

/**
 * Where the owner connects the assistant.
 *
 * The field is always empty on load and the saved key is never sent to the
 * browser — the card shows only whether one is set and its last four
 * characters, which is enough to recognise it without exposing it.
 */
export function AiKeyCard({
  hint,
}: {
  hint: { set: boolean; source: "env" | "database" | null; last4: string };
}) {
  const [state, action] = useActionState(saveAiKeyAction, null);

  if (hint.source === "env") {
    return (
      <Card title="Connection">
        <div className="p-5 text-sm text-[var(--a-muted)]">
          The assistant is connected using the <code>ANTHROPIC_API_KEY</code> environment
          variable (ending <code>…{hint.last4}</code>). That takes priority over anything set
          here, and it is the more secure place to keep it.
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={hint.set ? "Connection" : "Connect the assistant"}
      description={
        hint.set
          ? undefined
          : "Paste an Anthropic API key to switch the assistant on. It is stored on the server and never sent back to your browser."
      }
    >
      <form action={action} className="space-y-4 p-5">
        {hint.set && (
          <p className="text-sm text-[var(--a-muted)]">
            A key ending <code>…{hint.last4}</code> is saved. Paste a new one to replace it, or
            submit the field empty to remove it.
          </p>
        )}

        <div>
          <label className="a-label" htmlFor="apiKey">
            Anthropic API key
          </label>
          <input
            id="apiKey"
            name="apiKey"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder={hint.set ? "Paste a new key to replace the saved one" : "sk-ant-…"}
            className="a-input font-mono"
          />
          <p className="a-help">
            Create one at{" "}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              console.anthropic.com
            </a>
            . Only a Super Admin can set it.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <SubmitButton pendingLabel="Saving…">Save key</SubmitButton>
          <FormMessage state={state} />
        </div>
      </form>
    </Card>
  );
}
