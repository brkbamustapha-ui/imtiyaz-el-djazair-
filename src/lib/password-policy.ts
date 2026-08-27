export type PasswordCheck = { ok: boolean; problems: string[] };

/**
 * Password policy — pure, no Node built-ins, so the same rules can run in the
 * browser for live feedback and on the server where they are enforced.
 */
export function checkPasswordStrength(password: string): PasswordCheck {
  const problems: string[] = [];
  if (password.length < 10) problems.push("Use at least 10 characters.");
  if (!/[a-z]/.test(password)) problems.push("Add a lowercase letter.");
  if (!/[A-Z]/.test(password)) problems.push("Add an uppercase letter.");
  if (!/[0-9]/.test(password)) problems.push("Add a number.");
  if (password.length > 200) problems.push("Password is too long.");
  return { ok: problems.length === 0, problems };
}
