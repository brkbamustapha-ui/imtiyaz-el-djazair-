"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { t, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { FormFieldDef } from "@/lib/forms";

type Status = "idle" | "submitting" | "success" | "error";

const COPY = {
  send: { en: "Send message", fr: "Envoyer le message", ar: "إرسال الرسالة" },
  sending: { en: "Sending…", fr: "Envoi…", ar: "جارٍ الإرسال…" },
  required: { en: "required", fr: "obligatoire", ar: "مطلوب" },
  choose: { en: "Choose…", fr: "Choisir…", ar: "اختر…" },
  genericError: {
    en: "Something went wrong. Please try again.",
    fr: "Une erreur est survenue. Merci de réessayer.",
    ar: "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
  },
};

export function DynamicForm({
  slug,
  fields,
  csrfToken,
  locale,
  successMessage,
}: {
  slug: string;
  fields: FormFieldDef[];
  csrfToken: string;
  locale: Locale;
  successMessage: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const startedAt = useRef(Date.now());
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;

    setStatus("submitting");
    setFieldErrors({});
    setMessage("");

    const body = new FormData(event.currentTarget);
    body.set("_csrf", csrfToken);
    body.set("_ts", String(startedAt.current));
    body.set("_locale", locale);

    try {
      const response = await fetch(`/api/forms/${slug}`, { method: "POST", body });
      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
        message?: string;
        fieldErrors?: Record<string, string>;
      };

      if (response.ok && payload.ok) {
        setStatus("success");
        setMessage(payload.message || successMessage);
        formRef.current?.reset();
        startedAt.current = Date.now();
        return;
      }

      setStatus("error");
      if (payload.fieldErrors) setFieldErrors(payload.fieldErrors);
      setMessage(payload.error || (payload.fieldErrors ? "" : t(COPY.genericError, locale)));
    } catch {
      setStatus("error");
      setMessage(t(COPY.genericError, locale));
    }
  }

  if (status === "success") {
    return (
      <div
        className="card flex flex-col items-center gap-4 p-10 text-center"
        role="status"
        aria-live="polite"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[rgb(var(--c-accent-rgb)/0.14)] text-[var(--c-accent)]">
          <Icon name="check" size={26} />
        </span>
        <p className="text-[0.98rem] font-medium text-[var(--c-text)]">{message}</p>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => {
            setStatus("idle");
            setMessage("");
          }}
        >
          {locale === "fr" ? "Envoyer un autre message" : locale === "ar" ? "إرسال رسالة أخرى" : "Send another message"}
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="card p-6 sm:p-8">
      {/* Honeypot — hidden from users, catches naive bots. */}
      <div aria-hidden className="absolute h-0 w-0 overflow-hidden opacity-0">
        <label htmlFor={`${slug}-website`}>Do not fill this in</label>
        <input id={`${slug}-website`} type="text" name="_hp" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map((field) => (
          <div
            key={field.id}
            className={cn(field.width === "half" ? "sm:col-span-1" : "sm:col-span-2")}
          >
            <label className="field-label" htmlFor={`${slug}-${field.name}`}>
              {t(field.label, locale)}
              {field.required && (
                <span className="ms-1 text-[var(--c-accent)]" aria-hidden>
                  *
                </span>
              )}
              {field.required && <span className="sr-only"> ({t(COPY.required, locale)})</span>}
            </label>

            <FieldInput slug={slug} field={field} locale={locale} invalid={Boolean(fieldErrors[field.name])} />

            {field.help && <p className="mt-1.5 text-xs text-[var(--c-muted)]">{field.help}</p>}
            {fieldErrors[field.name] && (
              <p className="field-error" role="alert">
                {fieldErrors[field.name]}
              </p>
            )}
          </div>
        ))}
      </div>

      {status === "error" && message && (
        <p className="field-error mt-5" role="alert">
          {message}
        </p>
      )}

      <button type="submit" className="btn btn-primary mt-7 w-full" disabled={status === "submitting"}>
        {status === "submitting" ? t(COPY.sending, locale) : t(COPY.send, locale)}
        {status !== "submitting" && <Icon name="arrowRight" size={16} className="rtl-flip" />}
      </button>
    </form>
  );
}

function FieldInput({
  slug,
  field,
  locale,
  invalid,
}: {
  slug: string;
  field: FormFieldDef;
  locale: Locale;
  invalid: boolean;
}) {
  const id = `${slug}-${field.name}`;
  const common = {
    id,
    name: field.name,
    required: field.required,
    placeholder: field.placeholder,
    "aria-invalid": invalid || undefined,
    className: cn("field", invalid && "!border-[#ff8095]"),
  };

  switch (field.type) {
    case "textarea":
      return <textarea {...common} rows={5} maxLength={field.maxLength ?? 3000} className={cn(common.className, "resize-y")} />;
    case "select":
      return (
        <select {...common} defaultValue="">
          <option value="" disabled>
            {t(COPY.choose, locale)}
          </option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    case "radio":
      return (
        <fieldset className="mt-1 flex flex-wrap gap-x-5 gap-y-2.5">
          <legend className="sr-only">{t(field.label, locale)}</legend>
          {(field.options ?? []).map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm text-[var(--c-muted)]">
              <input
                type="radio"
                name={field.name}
                value={option}
                required={field.required}
                className="h-4 w-4 accent-[var(--c-accent)]"
              />
              {option}
            </label>
          ))}
        </fieldset>
      );
    case "checkbox":
      return (
        <label className="flex items-start gap-2.5 text-sm text-[var(--c-muted)]">
          <input
            id={id}
            type="checkbox"
            name={field.name}
            value="yes"
            required={field.required}
            className="mt-0.5 h-4 w-4 accent-[var(--c-accent)]"
          />
          {field.placeholder || t(field.label, locale)}
        </label>
      );
    case "file":
      return (
        <input
          {...common}
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          className={cn(
            common.className,
            "file:me-3 file:rounded-full file:border-0 file:bg-[rgb(var(--c-accent-rgb)/0.16)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[var(--c-accent)]",
          )}
        />
      );
    case "number":
      return <input {...common} type="number" inputMode="numeric" />;
    case "date":
      return <input {...common} type="date" />;
    case "email":
      return <input {...common} type="email" autoComplete="email" inputMode="email" />;
    case "tel":
      return <input {...common} type="tel" autoComplete="tel" inputMode="tel" />;
    default:
      return <input {...common} type="text" maxLength={field.maxLength ?? 200} />;
  }
}
