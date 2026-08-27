"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signInAction, type ActionState } from "@/app/admin/actions/auth";
import { SubmitButton, Notice, Field } from "./ui";
import { Icon } from "@/components/ui/Icon";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState<ActionState, FormData>(signInAction, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}

      <Field label="Email address" htmlFor="email">
        <input
          id="email"
          name="email"
          type="email"
          className="a-input"
          autoComplete="username"
          required
          autoFocus
          placeholder="you@example.com"
        />
      </Field>

      <Field label="Password" htmlFor="password">
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            className="a-input pe-11"
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute end-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded text-[var(--a-faint)] hover:text-[var(--a-text)]"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            <Icon name={showPassword ? "eyeOff" : "eye"} size={16} />
          </button>
        </div>
      </Field>

      {state?.message && !state.ok && <Notice tone="danger">{state.message}</Notice>}

      <SubmitButton className="w-full" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>

      <p className="text-center text-xs text-[var(--a-muted)]">
        <Link href="/admin/forgot-password" className="hover:text-[var(--a-text)]">
          Forgot your password?
        </Link>
      </p>
    </form>
  );
}
