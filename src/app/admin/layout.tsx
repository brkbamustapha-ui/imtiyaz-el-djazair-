import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./admin.css";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Imtiyaz Admin" },
  robots: { index: false, follow: false },
};

/**
 * Wrapper only — it applies the admin design tokens and forces LTR so the
 * dashboard stays usable when the public site is set to Arabic.
 * Authorisation lives in (dashboard)/layout.tsx and in every server action.
 */
export default async function AdminRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const theme = (await cookies()).get("ied_admin_theme")?.value === "light" ? "light" : "dark";
  return (
    <div className="admin-root" data-admin-theme={theme} dir="ltr">
      {children}
    </div>
  );
}
