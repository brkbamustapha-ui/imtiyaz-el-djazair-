"use client";

import { checkPasswordStrength } from "@/lib/password-policy";

/**
 * Live feedback only — the same rules are enforced on the server in
 * `checkPasswordStrength`, which is the check that actually gates the save.
 */
export function PasswordStrength({ value }: { value: string }) {
  if (!value) return null;
  const { ok, problems } = checkPasswordStrength(value);
  const score = Math.max(0, 4 - problems.length);
  const labels = ["Too weak", "Weak", "Fair", "Good", "Strong"];
  const colors = ["var(--a-danger)", "var(--a-danger)", "var(--a-warn)", "var(--a-brand)", "var(--a-success)"];

  return (
    <div className="mt-2">
      <div className="flex gap-1" aria-hidden>
        {[0, 1, 2, 3].map((index) => (
          <span
            key={index}
            className="h-1 flex-1 rounded-full transition-colors"
            style={{ background: index < score ? colors[score] : "var(--a-line)" }}
          />
        ))}
      </div>
      <p className="a-help" style={{ color: ok ? "var(--a-success)" : undefined }}>
        {labels[score]}
        {!ok && problems.length > 0 && ` — ${problems[0]}`}
      </p>
    </div>
  );
}
