"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { LogoMark } from "@/components/public/Logo";
import { NAV_GROUPS } from "./nav-config";
import { can, ROLE_LABELS, type Role } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export const ADMIN_THEME_COOKIE = "ied_admin_theme";

export function AdminShell({
  children,
  user,
  siteName,
  initialTheme,
  unreadMessages,
}: {
  children: ReactNode;
  user: { name: string; email: string; role: Role };
  siteName: string;
  initialTheme: "dark" | "light";
  unreadMessages: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(initialTheme);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const root = document.querySelector(".admin-root");
    if (root) root.setAttribute("data-admin-theme", theme);
    document.cookie = `${ADMIN_THEME_COOKIE}=${theme};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
  }, [theme]);

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || can(user.role, item.permission)),
  })).filter((group) => group.items.length > 0);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const sidebar = (
    <>
      <div className="flex items-center gap-2.5 border-b border-[var(--a-line)] px-4 py-4">
        <LogoMark className="h-10 w-auto shrink-0" simple />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[0.82rem] font-bold">{siteName}</p>
          <p className="text-[0.62rem] uppercase tracking-[0.14em] text-[var(--a-faint)]">
            Control panel
          </p>
        </div>
      </div>

      <nav className="flex-1 py-2" aria-label="Admin">
        {groups.map((group) => (
          <div key={group.label} className="a-nav-group">
            <p className="a-nav-label">{group.label}</p>
            <ul>
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="a-nav-link"
                    data-active={isActive(item.href, item.exact)}
                    aria-current={isActive(item.href, item.exact) ? "page" : undefined}
                  >
                    <Icon name={item.icon} size={16} />
                    <span className="truncate">{item.label}</span>
                    {item.href === "/admin/forms" && unreadMessages > 0 && (
                      <span className="ms-auto rounded-full bg-[var(--a-brand)] px-1.5 py-0.5 text-[0.62rem] font-bold text-[#04121b]">
                        {unreadMessages > 99 ? "99+" : unreadMessages}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--a-line)] p-3">
        <Link href="/admin/account" className="a-nav-link" data-active={isActive("/admin/account")}>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--a-brand-soft)] text-[0.7rem] font-bold text-[var(--a-brand)]">
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[0.8rem] font-semibold text-[var(--a-text)]">
              {user.name}
            </span>
            <span className="block text-[0.66rem] text-[var(--a-faint)]">
              {ROLE_LABELS[user.role]}
            </span>
          </span>
        </Link>
        <form action="/admin/logout" method="post" className="mt-1">
          <button type="submit" className="a-nav-link w-full">
            <Icon name="logout" size={16} />
            Sign out
          </button>
        </form>
      </div>
    </>
  );

  return (
    <div className="a-shell">
      <aside className="a-sidebar hidden lg:flex">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} aria-hidden />
          <aside className="a-sidebar absolute inset-y-0 left-0 flex w-[264px]">{sidebar}</aside>
        </div>
      )}

      <div className="a-main">
        <header className="a-topbar">
          <button
            type="button"
            className="a-btn a-btn-ghost a-btn-icon lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Icon name="menu" size={20} />
          </button>

          <Link
            href="/admin/builder"
            className={cn("a-btn a-btn-primary a-btn-sm", !can(user.role, "content.edit") && "hidden")}
          >
            <Icon name="edit" size={15} />
            Edit website
          </Link>

          <div className="ms-auto flex items-center gap-1.5">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="a-btn a-btn-ghost a-btn-sm"
              title="Open the public website in a new tab"
            >
              <Icon name="arrowUpRight" size={15} />
              <span className="hidden sm:inline">View site</span>
            </Link>
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="a-btn a-btn-ghost a-btn-icon"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              <Icon name={theme === "dark" ? "sparkles" : "star"} size={17} />
            </button>
          </div>
        </header>

        <main className="a-content">{children}</main>
      </div>
    </div>
  );
}
