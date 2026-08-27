"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  changePasswordAction,
  revokeOtherSessionsAction,
  updateProfileAction,
  type ActionState,
} from "@/app/admin/actions/auth";
import { Card, ConfirmButton, Field, Notice, SubmitButton } from "./ui";
import { PasswordStrength } from "./PasswordStrength";

export function AccountForms({
  initialName,
  initialEmail,
  role,
}: {
  initialName: string;
  initialEmail: string;
  role: string;
}) {
  const router = useRouter();
  const [profileState, profileAction] = useActionState<ActionState, FormData>(updateProfileAction, null);
  const [passwordState, passwordAction] = useActionState<ActionState, FormData>(changePasswordAction, null);
  const [newPassword, setNewPassword] = useState("");
  const [revokeMessage, setRevokeMessage] = useState<ActionState>(null);
  const [, startTransition] = useTransition();

  return (
    <div className="space-y-5">
      <Card title="Your details" description={`Signed in as ${role}.`}>
        <form action={profileAction} className="space-y-4 p-5">
          <Field label="Full name" htmlFor="account-name">
            <input id="account-name" name="name" className="a-input" defaultValue={initialName} required />
          </Field>
          <Field label="Email address" htmlFor="account-email" help="This is also your sign-in name.">
            <input
              id="account-email"
              name="email"
              type="email"
              className="a-input"
              defaultValue={initialEmail}
              required
            />
          </Field>
          <Field label="Confirm with your password" htmlFor="account-confirm">
            <input
              id="account-confirm"
              name="password"
              type="password"
              className="a-input"
              autoComplete="current-password"
              required
            />
          </Field>
          {profileState?.message && (
            <Notice tone={profileState.ok ? "success" : "danger"}>{profileState.message}</Notice>
          )}
          <SubmitButton>Save details</SubmitButton>
        </form>
      </Card>

      <Card title="Change password" description="Changing it signs you out of every other device.">
        <form action={passwordAction} className="space-y-4 p-5">
          <Field label="Current password" htmlFor="current-password">
            <input
              id="current-password"
              name="currentPassword"
              type="password"
              className="a-input"
              autoComplete="current-password"
              required
            />
          </Field>
          <Field label="New password" htmlFor="new-password">
            <input
              id="new-password"
              name="newPassword"
              type="password"
              className="a-input"
              autoComplete="new-password"
              required
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
            <PasswordStrength value={newPassword} />
          </Field>
          <Field label="Confirm new password" htmlFor="confirm-password">
            <input
              id="confirm-password"
              name="confirmPassword"
              type="password"
              className="a-input"
              autoComplete="new-password"
              required
            />
          </Field>
          {passwordState?.message && (
            <Notice tone={passwordState.ok ? "success" : "danger"}>{passwordState.message}</Notice>
          )}
          <SubmitButton>Change password</SubmitButton>
        </form>
      </Card>

      <Card title="Sessions">
        <div className="space-y-3 p-5">
          {revokeMessage?.message && (
            <Notice tone={revokeMessage.ok ? "success" : "danger"}>{revokeMessage.message}</Notice>
          )}
          <ConfirmButton
            label="Sign out other devices"
            variant="outline"
            confirmTitle="Sign out every other device?"
            confirmBody="You stay signed in here. Anyone else using your account elsewhere is signed out."
            onConfirm={() =>
              startTransition(async () => {
                const result = await revokeOtherSessionsAction();
                setRevokeMessage(result);
                router.refresh();
              })
            }
          />
        </div>
      </Card>
    </div>
  );
}
