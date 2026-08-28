"use client";

import { useState } from "react";
import { Card, Notice, Spinner } from "./ui";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type Preset = {
  task: string;
  label: string;
  hint: string;
  icon: string;
};

const PRESETS: Preset[] = [
  { task: "improve", label: "Improve the writing", hint: "Clearer and better paced, same facts", icon: "sparkles" },
  { task: "professional", label: "Make it professional", hint: "Institutional register for a school", icon: "award" },
  { task: "fix", label: "Fix spelling & grammar", hint: "Corrections only, wording untouched", icon: "check" },
  { task: "shorten", label: "Make it shorter", hint: "Same content, fewer words", icon: "text" },
  { task: "expand", label: "Develop it further", hint: "Fuller paragraph, no new facts", icon: "pen" },
  { task: "summarize", label: "Summarise", hint: "Two or three sentences", icon: "clipboard" },
  { task: "title", label: "Suggest titles", hint: "Five options for a section heading", icon: "star" },
  { task: "translate_en", label: "Translate to English", hint: "", icon: "globe" },
  { task: "translate_fr", label: "Translate to French", hint: "", icon: "globe" },
  { task: "translate_ar", label: "Translate to Arabic", hint: "", icon: "globe" },
  { task: "instagram", label: "Instagram caption", hint: "Caption plus hashtags", icon: "instagram" },
  { task: "tiktok", label: "TikTok description", hint: "Short description plus hashtags", icon: "tiktok" },
];

export function AiAssistant({ configured }: { configured: boolean }) {
  const [text, setText] = useState("");
  const [instruction, setInstruction] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function run(task: string) {
    setBusy(task);
    setError("");
    setResult("");
    setCopied(false);
    try {
      const response = await fetch("/admin/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, text, instruction }),
      });
      const payload = (await response.json()) as { ok: boolean; text?: string; error?: string };
      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "The assistant failed.");
        return;
      }
      setResult(payload.text ?? "");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(null);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Your browser blocked the clipboard. Select the text and copy it manually.");
    }
  }

  const disabled = !configured || busy !== null;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {!configured && (
        <div className="lg:col-span-2">
          <Notice tone="warn">
            <p className="font-semibold">The assistant is not connected yet</p>
            <p className="mt-1">
              Add an <code>ANTHROPIC_API_KEY</code> environment variable to the project on Vercel
              (Settings → Environment Variables) and redeploy. The key is read on the server only —
              it never reaches the browser. Everything else in the dashboard works without it.
            </p>
          </Notice>
        </div>
      )}

      {/* ------------------------------------------------------------- input */}
      <Card
        title="Your text"
        description="Paste the text you want to work on, then choose what to do with it."
      >
        <div className="p-5">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={12}
            maxLength={12000}
            placeholder="Paste a section title, a paragraph, a description…"
            className="a-textarea w-full"
            disabled={!configured}
          />
          <p className="mt-2 text-[0.72rem] text-[var(--a-muted)]">
            {text.length.toLocaleString()} / 12,000 characters
          </p>

          <div className="mt-5 border-t border-[var(--a-line)] pt-5">
            <label className="mb-1.5 block text-[0.78rem] font-semibold" htmlFor="ai-instruction">
              Or ask for something specific
            </label>
            <div className="flex flex-wrap gap-2">
              <input
                id="ai-instruction"
                value={instruction}
                onChange={(event) => setInstruction(event.target.value)}
                maxLength={600}
                placeholder="e.g. Write a description for our Summer Camp"
                className="a-input min-w-0 flex-1"
                disabled={!configured}
              />
              <button
                type="button"
                onClick={() => void run("custom")}
                disabled={disabled || !instruction.trim()}
                className="a-btn a-btn-primary"
              >
                {busy === "custom" ? <Spinner /> : <Icon name="sparkles" size={15} />}
                Run
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* ------------------------------------------------------------ result */}
      <Card
        title="Result"
        description="Nothing is saved automatically — read it, then copy it into the field you are editing."
        actions={
          result ? (
            <button type="button" onClick={() => void copy()} className="a-btn a-btn-outline">
              <Icon name={copied ? "check" : "copy"} size={15} />
              {copied ? "Copied" : "Copy"}
            </button>
          ) : null
        }
      >
        <div className="p-5">
          {error && (
            <Notice tone="danger">{error}</Notice>
          )}

          {!error && !result && (
            <p className="py-10 text-center text-sm text-[var(--a-muted)]">
              {busy ? "Working…" : "The assistant's answer will appear here."}
            </p>
          )}

          {result && (
            <div
              className="a-input max-h-[26rem] w-full overflow-auto whitespace-pre-wrap text-sm leading-relaxed"
              // A read-only panel rather than an editable field: the answer is a
              // suggestion to review and paste, never something that silently
              // becomes the live site.
              role="region"
              aria-label="Assistant result"
            >
              {result}
            </div>
          )}
        </div>
      </Card>

      {/* ----------------------------------------------------------- presets */}
      <div className="lg:col-span-2">
        <Card
          title="What should it do?"
          description="Each button sends the text above. The assistant is told never to invent facts, figures or names about the school."
        >
          <ul className="grid gap-2.5 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {PRESETS.map((preset) => (
              <li key={preset.task}>
                <button
                  type="button"
                  onClick={() => void run(preset.task)}
                  disabled={disabled || !text.trim()}
                  className={cn(
                    "group flex w-full items-start gap-3 rounded-[10px] border p-3.5 text-start",
                    "border-[var(--a-line)] bg-[var(--a-panel)] transition-all duration-200",
                    "hover:-translate-y-0.5 hover:border-[var(--a-brand)] hover:shadow-lg",
                    "disabled:pointer-events-none disabled:opacity-45",
                  )}
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--a-brand-soft)] text-[var(--a-brand)]">
                    {busy === preset.task ? <Spinner /> : <Icon name={preset.icon} size={16} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[0.84rem] font-semibold">{preset.label}</span>
                    {preset.hint && (
                      <span className="mt-0.5 block text-[0.74rem] leading-snug text-[var(--a-muted)]">
                        {preset.hint}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
