"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { resetSettingsAction, saveSettingsAction } from "@/app/admin/actions/settings";
import {
  FONT_CHOICES,
  THEME_PRESETS,
  type AppearanceSettings,
} from "@/lib/settings-schema";
import { appearanceToCssVars } from "@/lib/theme";
import { Icon } from "@/components/ui/Icon";
import { Card, ConfirmButton, Field, Notice, Spinner } from "./ui";
import { cn } from "@/lib/utils";

const COLOR_FIELDS: { key: keyof AppearanceSettings["colors"]; label: string; help?: string }[] = [
  { key: "background", label: "Page background" },
  { key: "surface", label: "Section background", help: "Used by alternating sections and the footer." },
  { key: "surfaceElevated", label: "Card background" },
  { key: "text", label: "Text" },
  { key: "textMuted", label: "Secondary text" },
  { key: "primary", label: "Primary", help: "Links, icons and the 3D scene." },
  { key: "primaryDark", label: "Primary (dark)" },
  { key: "accent", label: "Accent", help: "Buttons, eyebrows and highlights." },
  { key: "accentSoft", label: "Accent (light)" },
  { key: "border", label: "Borders" },
];

export function AppearanceEditor({ initial }: { initial: AppearanceSettings }) {
  const router = useRouter();
  const [values, setValues] = useState<AppearanceSettings>(initial);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof AppearanceSettings>(key: K, value: AppearanceSettings[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const setColor = (key: keyof AppearanceSettings["colors"], value: string) =>
    setValues((current) => ({
      ...current,
      preset: "custom",
      colors: { ...current.colors, [key]: value },
    }));

  const applyPreset = (presetKey: string) => {
    const preset = THEME_PRESETS[presetKey];
    if (!preset) return;
    setValues((current) => ({ ...current, preset: presetKey, colors: { ...preset.colors } }));
  };

  const save = () => {
    startTransition(async () => {
      const result = await saveSettingsAction("appearance", values as unknown as Record<string, unknown>);
      setMessage({ ok: result.ok, text: result.message });
      router.refresh();
    });
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_460px]">
      <div className="space-y-5">
        <Card title="Theme presets" description="A starting point — every colour can still be changed below.">
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            {Object.entries(THEME_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                type="button"
                onClick={() => applyPreset(key)}
                className={cn(
                  "rounded-[var(--a-radius-sm)] border p-3 text-start transition-colors",
                  values.preset === key
                    ? "border-[var(--a-brand)] bg-[var(--a-brand-soft)]"
                    : "border-[var(--a-line)] hover:border-[var(--a-brand)]",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[0.86rem] font-semibold">{preset.label}</span>
                  {values.preset === key && <Icon name="check" size={15} className="text-[var(--a-brand)]" />}
                </span>
                <span className="mt-2.5 flex gap-1">
                  {["background", "surface", "primary", "accent", "text"].map((field) => (
                    <span
                      key={field}
                      className="h-6 flex-1 rounded border border-black/20"
                      style={{ background: preset.colors[field as keyof typeof preset.colors] }}
                    />
                  ))}
                </span>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Colours" description="Custom values switch the preset to “custom”.">
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {COLOR_FIELDS.map((field) => (
              <Field key={field.key} label={field.label} help={field.help}>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    className="h-9 w-11 shrink-0 cursor-pointer rounded border border-[var(--a-line)] bg-transparent"
                    value={values.colors[field.key]}
                    onChange={(event) => setColor(field.key, event.target.value)}
                    aria-label={field.label}
                  />
                  <input
                    className="a-input a-mono"
                    value={values.colors[field.key]}
                    onChange={(event) => setColor(field.key, event.target.value)}
                  />
                </div>
              </Field>
            ))}
          </div>
        </Card>

        <Card title="Typography">
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Heading font" htmlFor="font-heading" help="Loaded from Google Fonts.">
              <select
                id="font-heading"
                className="a-select"
                value={values.fontHeading}
                onChange={(event) => set("fontHeading", event.target.value)}
              >
                {FONT_CHOICES.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Body font" htmlFor="font-body">
              <select
                id="font-body"
                className="a-select"
                value={values.fontBody}
                onChange={(event) => set("fontBody", event.target.value)}
              >
                {FONT_CHOICES.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </Field>
            <RangeField
              label="Heading size"
              value={values.headingScale}
              min={0.8}
              max={1.35}
              step={0.05}
              format={(value) => `${Math.round(value * 100)}%`}
              onChange={(value) => set("headingScale", value)}
            />
          </div>
        </Card>

        <Card title="Shape & depth">
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <RangeField
              label="Corner radius"
              value={values.radius}
              min={0}
              max={40}
              step={1}
              format={(value) => `${value}px`}
              onChange={(value) => set("radius", value)}
            />
            <RangeField
              label="Shadow strength"
              value={values.shadowStrength}
              min={0}
              max={1}
              step={0.05}
              format={(value) => `${Math.round(value * 100)}%`}
              onChange={(value) => set("shadowStrength", value)}
            />
            <RangeField
              label="Glass transparency"
              value={values.glassOpacity}
              min={0}
              max={0.3}
              step={0.01}
              format={(value) => value.toFixed(2)}
              onChange={(value) => set("glassOpacity", value)}
            />
            <Field label="Button shape" htmlFor="button-style">
              <select
                id="button-style"
                className="a-select"
                value={values.buttonStyle}
                onChange={(event) => set("buttonStyle", event.target.value as AppearanceSettings["buttonStyle"])}
              >
                <option value="pill">Pill</option>
                <option value="rounded">Rounded</option>
                <option value="square">Square</option>
              </select>
            </Field>
          </div>
        </Card>

        <Card
          title="Motion & 3D"
          description="Visitors who ask their device for reduced motion always get the still version, whatever is set here."
        >
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <CheckboxField
              label="Animations"
              help="Scroll reveals, hover effects and transitions."
              checked={values.animationsEnabled}
              onChange={(value) => set("animationsEnabled", value)}
            />
            <RangeField
              label="Animation speed"
              value={values.animationSpeed}
              min={0.5}
              max={1.8}
              step={0.1}
              format={(value) => `${value.toFixed(1)}×`}
              onChange={(value) => set("animationSpeed", value)}
            />
            <CheckboxField
              label="3D hero scene"
              help="Automatically skipped on low-power devices."
              checked={values.effects3dEnabled}
              onChange={(value) => set("effects3dEnabled", value)}
            />
            <RangeField
              label="3D intensity"
              value={values.effects3dIntensity}
              min={0}
              max={1}
              step={0.05}
              format={(value) => `${Math.round(value * 100)}%`}
              onChange={(value) => set("effects3dIntensity", value)}
            />
            <CheckboxField
              label="Film grain overlay"
              checked={values.grain}
              onChange={(value) => set("grain", value)}
            />
          </div>
        </Card>

        {message && <Notice tone={message.ok ? "success" : "danger"}>{message.text}</Notice>}

        <div className="flex flex-wrap gap-2">
          <button type="button" className="a-btn a-btn-primary" onClick={save} disabled={pending}>
            {pending && <Spinner />}
            Save appearance
          </button>
          <ConfirmButton
            label="Reset to defaults"
            variant="outline"
            confirmTitle="Reset the appearance?"
            confirmBody="Colours, fonts and motion settings go back to the original Luxury Gold theme."
            onConfirm={() =>
              startTransition(async () => {
                const result = await resetSettingsAction("appearance");
                setMessage({ ok: result.ok, text: result.message });
                router.refresh();
              })
            }
          />
        </div>
      </div>

      <div className="xl:sticky xl:top-20 xl:self-start">
        <ThemePreview appearance={values} />
      </div>
    </div>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="a-label !mb-0">{label}</span>
        <span className="a-mono text-[0.72rem] text-[var(--a-muted)]">{format(value)}</span>
      </div>
      <input
        type="range"
        className="w-full accent-[var(--a-brand)]"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
      />
    </div>
  );
}

function CheckboxField({
  label,
  help,
  checked,
  onChange,
}: {
  label: string;
  help?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-[var(--a-radius-sm)] border border-[var(--a-line)] p-3">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 accent-[var(--a-brand)]"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        <span className="block text-[0.85rem] font-medium">{label}</span>
        {help && <span className="a-help">{help}</span>}
      </span>
    </label>
  );
}

/** Renders real site components with the pending tokens applied. */
function ThemePreview({ appearance }: { appearance: AppearanceSettings }) {
  return (
    <div className="a-card overflow-hidden">
      <p className="border-b border-[var(--a-line)] p-3 text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-[var(--a-faint)]">
        Live preview
      </p>
      <div
        style={{ ...(parseVars(appearance) as React.CSSProperties) }}
        className="space-y-5 p-6"
      >
        <div
          className="rounded-[var(--radius-lg)] p-6"
          style={{
            background:
              "radial-gradient(120% 90% at 80% 0%, rgb(var(--c-primary-rgb)/0.28), transparent 60%), var(--c-bg)",
            color: "var(--c-text)",
            border: "1px solid var(--c-border)",
          }}
        >
          <p
            style={{
              color: "var(--c-accent)",
              fontSize: "0.68rem",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            Excellence in education
          </p>
          <p
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: `calc(1.7rem * var(--heading-scale))`,
              fontWeight: 800,
              lineHeight: 1.1,
              marginTop: "0.6rem",
            }}
          >
            Imtiyaz El Djazair
          </p>
          <p style={{ color: "var(--c-muted)", fontSize: "0.86rem", marginTop: "0.6rem", lineHeight: 1.6 }}>
            Confidence for your future. This block uses the colours, fonts and radius you just set.
          </p>
          <div style={{ display: "flex", gap: "0.6rem", marginTop: "1.2rem", flexWrap: "wrap" }}>
            <span
              style={{
                background: "linear-gradient(120deg, var(--c-accent), var(--c-accent-soft), var(--c-accent))",
                color: "var(--c-on-accent)",
                borderRadius: "var(--btn-radius)",
                padding: "0.6rem 1.1rem",
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
            >
              Apply now
            </span>
            <span
              style={{
                border: "1px solid var(--c-border)",
                color: "var(--c-text)",
                borderRadius: "var(--btn-radius)",
                padding: "0.6rem 1.1rem",
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
            >
              Explore IELTS
            </span>
          </div>
        </div>

        <div
          style={{
            background: "var(--c-surface)",
            border: "1px solid var(--c-border)",
            borderRadius: "var(--radius)",
            padding: "1.1rem",
            color: "var(--c-text)",
            boxShadow: `0 24px 48px -32px rgb(0 0 0 / calc(var(--shadow-strength) * 1.4))`,
          }}
        >
          <p style={{ fontFamily: "var(--font-heading)", fontWeight: 650, fontSize: "1rem" }}>
            IELTS Preparation
          </p>
          <p style={{ color: "var(--c-muted)", fontSize: "0.82rem", marginTop: "0.4rem", lineHeight: 1.6 }}>
            Listening, Reading, Writing and Speaking with weekly corrected work.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          {(["primary", "accent", "surface", "border"] as const).map((token) => (
            <span
              key={token}
              style={{
                flex: 1,
                height: "2.2rem",
                borderRadius: "var(--radius-sm)",
                background: `var(--c-${token === "surface" ? "surface" : token})`,
                border: "1px solid var(--c-border)",
              }}
              title={token}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function parseVars(appearance: AppearanceSettings): Record<string, string> {
  const css = appearanceToCssVars(appearance);
  const result: Record<string, string> = {};
  css.split(";").forEach((declaration) => {
    const [key, ...rest] = declaration.split(":");
    if (key?.trim().startsWith("--")) result[key.trim()] = rest.join(":").trim();
  });
  return result;
}
