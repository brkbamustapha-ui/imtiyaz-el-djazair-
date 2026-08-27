import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Redirects to /admin/login when there is no valid session.
  const user = await requireUser();

  const [general, unread, theme] = await Promise.all([
    getSetting("general"),
    db.formSubmission.count({ where: { isRead: false, isArchived: false } }).catch(() => 0),
    cookies().then((store) => (store.get("ied_admin_theme")?.value === "light" ? "light" : "dark")),
  ]);

  return (
    <AdminShell
      user={{ name: user.name, email: user.email, role: user.role }}
      siteName={general.siteName}
      initialTheme={theme as "dark" | "light"}
      unreadMessages={unread}
    >
      {children}
    </AdminShell>
  );
}
