"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createUserAction,
  deleteUserAction,
  resetUserPasswordAction,
  updateUserAction,
} from "@/app/admin/actions/users";
import { PERMISSIONS, ROLE_LABELS, ROLES, can, type Role } from "@/lib/permissions";
import { Icon } from "@/components/ui/Icon";
import { Card, ConfirmButton, Field, Modal, Notice, Spinner } from "./ui";
import { PasswordStrength } from "./PasswordStrength";
import { formatDateTime } from "@/lib/utils";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  lockedUntil: string | null;
  activeSessions: number;
};

export function UsersManager({
  users,
  currentUserId,
  actorRole,
}: {
  users: UserRow[];
  currentUserId: string;
  actorRole: Role;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [resetting, setResetting] = useState<UserRow | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<{ ok: boolean; message: string }>, onDone?: () => void) => {
    startTransition(async () => {
      const result = await action();
      setMessage({ ok: result.ok, text: result.message });
      if (result.ok) onDone?.();
      router.refresh();
    });
  };

  return (
    <>
      {message && (
        <div className="mb-4">
          <Notice tone={message.ok ? "success" : "danger"}>{message.text}</Notice>
        </div>
      )}

      <div className="a-card mb-5">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--a-line)] p-4">
          <p className="text-sm text-[var(--a-muted)]">{users.length} accounts</p>
          <button type="button" className="a-btn a-btn-primary a-btn-sm" onClick={() => setCreating(true)}>
            <Icon name="plus" size={14} />
            Add user
          </button>
        </div>

        <div className="a-scroll-x">
          <table className="a-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last sign-in</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const locked = user.lockedUntil && new Date(user.lockedUntil) > new Date();
                return (
                  <tr key={user.id}>
                    <td>
                      <span className="block font-medium">
                        {user.name}
                        {user.id === currentUserId && (
                          <span className="ms-2 a-badge a-badge-brand">You</span>
                        )}
                      </span>
                      <span className="block text-[0.76rem] text-[var(--a-muted)]">{user.email}</span>
                    </td>
                    <td>
                      <span className="a-badge a-badge-neutral">
                        {ROLE_LABELS[user.role as Role] ?? user.role}
                      </span>
                    </td>
                    <td>
                      <span className="flex flex-wrap gap-1">
                        <span className={`a-badge ${user.isActive ? "a-badge-success" : "a-badge-danger"}`}>
                          {user.isActive ? "Active" : "Disabled"}
                        </span>
                        {locked && <span className="a-badge a-badge-warn">Locked</span>}
                        {user.mustChangePassword && (
                          <span className="a-badge a-badge-warn">Must change password</span>
                        )}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-[0.78rem] text-[var(--a-muted)]">
                      {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never"}
                      {user.activeSessions > 0 && (
                        <span className="block text-[0.68rem] text-[var(--a-faint)]">
                          {user.activeSessions} active session{user.activeSessions === 1 ? "" : "s"}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="a-btn a-btn-ghost a-btn-icon"
                          onClick={() => setEditing(user)}
                          aria-label={`Edit ${user.name}`}
                        >
                          <Icon name="edit" size={14} />
                        </button>
                        <button
                          type="button"
                          className="a-btn a-btn-ghost a-btn-icon"
                          onClick={() => setResetting(user)}
                          aria-label={`Reset password for ${user.name}`}
                          title="Set a temporary password"
                        >
                          <Icon name="key" size={14} />
                        </button>
                        {user.id !== currentUserId && (
                          <ConfirmButton
                            label="Delete"
                            icon="trash"
                            iconOnly
                            confirmTitle={`Delete ${user.name}?`}
                            confirmBody="Their account and sessions are removed. Content they created stays."
                            onConfirm={() => run(() => deleteUserAction(user.id))}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Card title="What each role can do">
        <div className="a-scroll-x">
          <table className="a-table">
            <thead>
              <tr>
                <th>Capability</th>
                {ROLES.map((role) => (
                  <th key={role} className="text-center">
                    {ROLE_LABELS[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((permission) => (
                <tr key={permission}>
                  <td className="a-mono text-[0.76rem]">{permission}</td>
                  {ROLES.map((role) => (
                    <td key={role} className="text-center">
                      {can(role, permission) ? (
                        <Icon name="check" size={15} className="mx-auto text-[var(--a-success)]" />
                      ) : (
                        <span className="text-[var(--a-faint)]">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <UserModal
        open={creating}
        title="Add user"
        actorRole={actorRole}
        pending={pending}
        withPassword
        onClose={() => setCreating(false)}
        onSubmit={(values) =>
          run(
            () =>
              createUserAction({
                name: values.name,
                email: values.email,
                role: values.role,
                password: values.password,
              }),
            () => setCreating(false),
          )
        }
      />

      {editing && (
        <UserModal
          open
          title={`Edit ${editing.name}`}
          actorRole={actorRole}
          pending={pending}
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={(values) =>
            run(
              () =>
                updateUserAction(editing.id, {
                  name: values.name,
                  email: values.email,
                  role: values.role,
                  isActive: values.isActive,
                }),
              () => setEditing(null),
            )
          }
        />
      )}

      {resetting && (
        <ResetPasswordModal
          user={resetting}
          pending={pending}
          onClose={() => setResetting(null)}
          onSubmit={(password) =>
            run(() => resetUserPasswordAction(resetting.id, password), () => setResetting(null))
          }
        />
      )}
    </>
  );
}

function UserModal({
  open,
  title,
  actorRole,
  pending,
  initial,
  withPassword,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  actorRole: Role;
  pending: boolean;
  initial?: UserRow;
  withPassword?: boolean;
  onClose: () => void;
  onSubmit: (values: {
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    password: string;
  }) => void;
}) {
  const [values, setValues] = useState({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    role: initial?.role ?? "EDITOR",
    isActive: initial?.isActive ?? true,
    password: "",
  });

  const assignableRoles = ROLES.filter(
    (role) => role !== "SUPER_ADMIN" || actorRole === "SUPER_ADMIN",
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button type="button" className="a-btn a-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="a-btn a-btn-primary"
            disabled={pending}
            onClick={() => onSubmit(values)}
          >
            {pending && <Spinner />}
            Save
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Full name" htmlFor="user-name">
          <input
            id="user-name"
            className="a-input"
            value={values.name}
            onChange={(event) => setValues({ ...values, name: event.target.value })}
          />
        </Field>
        <Field label="Email address" htmlFor="user-email">
          <input
            id="user-email"
            type="email"
            className="a-input"
            value={values.email}
            onChange={(event) => setValues({ ...values, email: event.target.value })}
          />
        </Field>
        <Field label="Role" htmlFor="user-role">
          <select
            id="user-role"
            className="a-select"
            value={values.role}
            onChange={(event) => setValues({ ...values, role: event.target.value })}
          >
            {assignableRoles.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </Field>

        {withPassword ? (
          <Field
            label="Temporary password"
            htmlFor="user-password"
            help="The user is asked to choose their own password the first time they sign in."
          >
            <input
              id="user-password"
              type="text"
              className="a-input a-mono"
              value={values.password}
              onChange={(event) => setValues({ ...values, password: event.target.value })}
              autoComplete="off"
            />
            <PasswordStrength value={values.password} />
          </Field>
        ) : (
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--a-brand)]"
              checked={values.isActive}
              onChange={(event) => setValues({ ...values, isActive: event.target.checked })}
            />
            <span className="text-sm">
              Account active
              <span className="a-help">Disabling signs the user out of every device immediately.</span>
            </span>
          </label>
        )}
      </div>
    </Modal>
  );
}

function ResetPasswordModal({
  user,
  pending,
  onClose,
  onSubmit,
}: {
  user: UserRow;
  pending: boolean;
  onClose: () => void;
  onSubmit: (password: string) => void;
}) {
  const [password, setPassword] = useState("");

  return (
    <Modal
      open
      onClose={onClose}
      title={`Set a temporary password for ${user.name}`}
      size="sm"
      footer={
        <>
          <button type="button" className="a-btn a-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="a-btn a-btn-primary"
            disabled={pending || password.length < 10}
            onClick={() => onSubmit(password)}
          >
            {pending && <Spinner />}
            Set password
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Notice tone="warn">
          Give this password to {user.name} through a channel you trust. They will be asked to
          change it as soon as they sign in, and all their existing sessions end now.
        </Notice>
        <Field label="Temporary password" htmlFor="reset-password">
          <input
            id="reset-password"
            type="text"
            className="a-input a-mono"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="off"
            autoFocus
          />
          <PasswordStrength value={password} />
        </Field>
      </div>
    </Modal>
  );
}
