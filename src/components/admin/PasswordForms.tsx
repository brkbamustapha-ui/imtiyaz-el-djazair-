"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  requestPasswordResetAction,
  resetPasswordAction,
  type ActionState,
} from "@/app/admin/actions/auth";
import { Field, Notice, SubmitButton } from "./ui";
import { PasswordStrength } from "./PasswordStrength";
import { useState } from "react";

export function ForgotPasswordForm() {
  const [state, action] = useActionState<ActionState, FormData>(requestPasswordResetAction, null);

  return (
    <form action={action} className="space-y-4">
      <Field label="Email address" htmlFor="email">
        <input id="email" name="email" type="email" className="a-input" required autoFocus />
      </Field>
      {state?.message && <Notice tone={state.ok ? "success" : "danger"}>{state.message}</Notice>}
      <SubmitButton className="w-full" pendingLabel="Sending…">
        Send reset link
      </SubmitButton>
      <p className="a-help">
        No mail server is configured by default, so the reset link is written to the server log.
        Your Super Admin can retrieve it, or you can wire up an email provider in
        <span className="a-mono"> src/app/admin/actions/auth.ts</span>.
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState<ActionState, FormData>(resetPasswordAction, null);
  const [password, setPassword] = useState("");

  if (!token) {
    return (
      <div className="space-y-4">
        <Notice tone="danger">This reset link is incomplete or has already been used.</Notice>
        <Link href="/admin/forgot-password" className="a-btn a-btn-outline w-full">
          Request a new link
        </Link>
      </div>
    );
  }

  if (state?.ok) {
    return (
      <div className="space-y-4">
        <Notice tone="success">{state.message}</Notice>
        <Link href="/admin/login" className="a-btn a-btn-primary w-full">
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <Field label="New password" htmlFor="password">
        <input
          id="password"
          name="password"
          type="password"
          className="a-input"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <PasswordStrength value={password} />
      </Field>
      <Field label="Confirm new password" htmlFor="confirmPassword">
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          className="a-input"
          autoComplete="new-password"
          required
        />
      </Field>
      {state?.message && !state.ok && <Notice tone="danger">{state.message}</Notice>}
      <SubmitButton className="w-full">Set new password</SubmitButton>
    </form>
  );
}
