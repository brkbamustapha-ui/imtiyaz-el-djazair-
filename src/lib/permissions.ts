export const ROLES = ["SUPER_ADMIN", "ADMIN", "EDITOR"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  EDITOR: "Editor",
};

/**
 * Every capability the admin area gates on. Keep this list flat and explicit —
 * it is the single source of truth for both UI rendering and server checks.
 */
export const PERMISSIONS = [
  "content.view",
  "content.edit",
  "content.publish",
  "media.upload",
  "media.delete",
  "pages.manage",
  "navigation.manage",
  "appearance.manage",
  "partners.manage",
  "forms.manage",
  "forms.view_submissions",
  "popups.manage",
  "seo.manage",
  "users.manage",
  "settings.manage",
  "advanced.manage",
  "audit.view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const EDITOR_PERMISSIONS: Permission[] = [
  "content.view",
  "content.edit",
  "media.upload",
];

const ADMIN_PERMISSIONS: Permission[] = [
  ...EDITOR_PERMISSIONS,
  "content.publish",
  "media.delete",
  "pages.manage",
  "navigation.manage",
  "appearance.manage",
  "partners.manage",
  "forms.manage",
  "forms.view_submissions",
  "popups.manage",
  "seo.manage",
  "audit.view",
];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  SUPER_ADMIN: PERMISSIONS,
  ADMIN: ADMIN_PERMISSIONS,
  EDITOR: EDITOR_PERMISSIONS,
};

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function permissionsForRole(role: string): readonly Permission[] {
  return isRole(role) ? ROLE_PERMISSIONS[role] : [];
}

export function can(role: string, permission: Permission): boolean {
  return permissionsForRole(role).includes(permission);
}
