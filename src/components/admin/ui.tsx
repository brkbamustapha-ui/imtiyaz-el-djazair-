"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

/* ------------------------------- Page header ------------------------------ */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-[1.55rem] font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--a-muted)]">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/* --------------------------------- Buttons -------------------------------- */

export function SubmitButton({
  children,
  variant = "primary",
  className,
  pendingLabel,
  disabled,
}: {
  children: ReactNode;
  variant?: "primary" | "outline" | "ghost" | "danger";
  className?: string;
  pendingLabel?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={cn("a-btn", `a-btn-${variant}`, className)}
    >
      {pending && <Spinner />}
      {pending ? (pendingLabel ?? "Saving…") : children}
    </button>
  );
}

export function Spinner({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/* ---------------------------------- Cards --------------------------------- */

export function Card({
  children,
  className,
  title,
  description,
  actions,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <section className={cn("a-card", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--a-line)] p-5">
          <div>
            {title && <h2 className="text-[0.98rem] font-semibold">{title}</h2>}
            {description && (
              <p className="mt-1 max-w-xl text-[0.8rem] leading-relaxed text-[var(--a-muted)]">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "brand",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: string;
  tone?: "brand" | "success" | "warn" | "neutral";
}) {
  const toneColor =
    tone === "success"
      ? "var(--a-success)"
      : tone === "warn"
        ? "var(--a-warn)"
        : tone === "neutral"
          ? "var(--a-muted)"
          : "var(--a-brand)";
  return (
    <div className="a-card a-card-pad">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.75rem] font-semibold uppercase tracking-[0.09em] text-[var(--a-faint)]">
          {label}
        </p>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-[var(--a-radius-sm)]"
          style={{ background: `color-mix(in srgb, ${toneColor} 14%, transparent)`, color: toneColor }}
        >
          <Icon name={icon} size={16} />
        </span>
      </div>
      <p className="mt-3 text-[1.85rem] font-bold leading-none tracking-tight">{value}</p>
      {hint && <p className="mt-2 text-xs text-[var(--a-muted)]">{hint}</p>}
    </div>
  );
}

/* --------------------------------- Notices -------------------------------- */

export function Notice({
  tone = "info",
  children,
  icon,
}: {
  tone?: "info" | "warn" | "danger" | "success";
  children: ReactNode;
  icon?: string;
}) {
  const defaultIcon =
    tone === "danger" ? "shield" : tone === "warn" ? "help" : tone === "success" ? "check" : "info";
  return (
    <div className={`a-notice a-notice-${tone}`} role={tone === "danger" ? "alert" : undefined}>
      <span className="mt-0.5 shrink-0">
        <Icon name={icon ?? defaultIcon} size={16} />
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function EmptyState({
  icon = "folder",
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="a-empty">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--a-text)_6%,transparent)]">
        <Icon name={icon} size={22} />
      </span>
      <p className="text-[0.95rem] font-semibold text-[var(--a-text)]">{title}</p>
      {description && <p className="max-w-md text-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/* --------------------------------- Toggle --------------------------------- */

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      data-on={checked}
      onClick={() => onChange(!checked)}
      className="a-toggle a-focus-ring disabled:opacity-50"
    />
  );
}

/* --------------------------------- Modal ---------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const width =
    size === "sm" ? "max-w-md" : size === "lg" ? "max-w-3xl" : size === "xl" ? "max-w-5xl" : "max-w-xl";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/60 p-4 py-10 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn("a-card w-full outline-none", width)}
        style={{ background: "var(--a-elevated)" }}
      >
        <div className="flex items-center justify-between gap-4 border-b border-[var(--a-line)] p-5">
          <h2 className="text-[1.02rem] font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="a-btn a-btn-ghost a-btn-icon" aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--a-line)] p-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------- Confirm-before-destroy ------------------------ */

export function ConfirmButton({
  onConfirm,
  label,
  confirmTitle,
  confirmBody,
  variant = "danger",
  icon,
  iconOnly,
}: {
  onConfirm: () => void | Promise<void>;
  label: string;
  confirmTitle?: string;
  confirmBody?: string;
  variant?: "danger" | "ghost" | "outline";
  icon?: string;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("a-btn", `a-btn-${variant}`, "a-btn-sm", iconOnly && "a-btn-icon")}
        aria-label={iconOnly ? label : undefined}
        title={iconOnly ? label : undefined}
      >
        {icon && <Icon name={icon} size={15} />}
        {!iconOnly && label}
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={confirmTitle ?? label}
        size="sm"
        footer={
          <>
            <button type="button" className="a-btn a-btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="a-btn a-btn-danger"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onConfirm();
                  setOpen(false);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy && <Spinner />}
              {busy ? "Working…" : label}
            </button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-[var(--a-muted)]">
          {confirmBody ?? "This cannot be undone. Are you sure?"}
        </p>
      </Modal>
    </>
  );
}

/* ------------------------------ Inline status ----------------------------- */

export function FormMessage({ state }: { state?: { ok?: boolean; message?: string } | null }) {
  if (!state?.message) return null;
  return (
    <div className="mt-4">
      <Notice tone={state.ok ? "success" : "danger"}>{state.message}</Notice>
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  help,
  error,
  children,
  className,
}: {
  label?: string;
  htmlFor?: string;
  help?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && (
        <label className="a-label" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {help && <p className="a-help">{help}</p>}
      {error && <p className="a-error">{error}</p>}
    </div>
  );
}
