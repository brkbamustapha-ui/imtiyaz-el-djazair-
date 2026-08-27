"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { cn, safeHref } from "@/lib/utils";
import type { MenuNode } from "@/server/content";

export function NavbarClient({
  items,
  logo,
  ctaLabel,
  ctaHref,
  localeSwitcher,
}: {
  items: MenuNode[];
  logo: ReactNode;
  ctaLabel: string;
  ctaHref: string;
  localeSwitcher: ReactNode;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const pathname = usePathname();
  const reduced = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setOpenSubmenu(null);
  }, [pathname]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href) && href !== "#";

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled ? "py-2" : "py-3.5",
      )}
      style={{ ["--header-h" as string]: "76px" }}
    >
      <div className="container-x">
        <nav
          aria-label="Main"
          className={cn(
            "flex items-center justify-between gap-4 rounded-[var(--radius)] px-4 py-2.5 transition-all duration-500 md:px-5",
            scrolled
              ? "glass shadow-[0_18px_44px_-30px_rgba(0,0,0,0.9)]"
              : "border border-transparent bg-transparent",
          )}
        >
          <Link href="/" className="shrink-0" aria-label="Go to home page">
            {logo}
          </Link>

          <ul className="hidden items-center gap-0.5 lg:flex">
            {items.map((item) => (
              <li key={item.id} className="relative">
                {item.children.length > 0 ? (
                  <div
                    onMouseEnter={() => setOpenSubmenu(item.id)}
                    onMouseLeave={() => setOpenSubmenu(null)}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenSubmenu((value) => (value === item.id ? null : item.id))}
                      aria-expanded={openSubmenu === item.id}
                      className={cn(
                        "flex items-center gap-1 rounded-full px-3.5 py-2 text-[0.88rem] font-medium transition-colors",
                        isActive(item.href)
                          ? "text-[var(--c-text)]"
                          : "text-[var(--c-muted)] hover:text-[var(--c-text)]",
                      )}
                    >
                      {item.label}
                      <Icon name="chevronDown" size={13} />
                    </button>
                    <AnimatePresence>
                      {openSubmenu === item.id && (
                        <motion.ul
                          initial={reduced ? undefined : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={reduced ? undefined : { opacity: 0, y: 8 }}
                          transition={{ duration: 0.18 }}
                          className="card absolute start-0 top-full z-50 mt-2 min-w-[220px] p-1.5"
                          style={{ background: "var(--c-surface-2)" }}
                        >
                          {item.children.map((child) => (
                            <li key={child.id}>
                              <Link
                                href={safeHref(child.href)}
                                target={child.openInNewTab ? "_blank" : undefined}
                                rel={child.openInNewTab ? "noopener noreferrer" : undefined}
                                className="block rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--c-muted)] transition-colors hover:bg-[rgb(var(--c-text-rgb)/0.05)] hover:text-[var(--c-text)]"
                              >
                                {child.label}
                              </Link>
                            </li>
                          ))}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Link
                    href={safeHref(item.href)}
                    target={item.openInNewTab ? "_blank" : undefined}
                    rel={item.openInNewTab ? "noopener noreferrer" : undefined}
                    className={cn(
                      "relative block rounded-full px-3.5 py-2 text-[0.88rem] font-medium transition-colors",
                      isActive(item.href)
                        ? "text-[var(--c-text)]"
                        : "text-[var(--c-muted)] hover:text-[var(--c-text)]",
                    )}
                  >
                    {item.label}
                    {isActive(item.href) && (
                      <span className="absolute inset-x-3.5 -bottom-0.5 h-px bg-[var(--c-accent)]" />
                    )}
                  </Link>
                )}
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-1.5">
            <div className="hidden sm:block">{localeSwitcher}</div>
            <Link href={safeHref(ctaHref)} className="btn btn-primary btn-sm hidden md:inline-flex">
              {ctaLabel}
            </Link>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="btn btn-ghost btn-sm !px-2 lg:hidden"
              aria-label="Open menu"
              aria-expanded={open}
              aria-controls="mobile-menu"
            >
              <Icon name="menu" size={22} />
            </button>
          </div>
        </nav>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={reduced ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            className="fixed inset-0 z-[60] lg:hidden"
          >
            <div
              className="absolute inset-0 bg-[var(--c-bg)]/92 backdrop-blur-xl"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <motion.div
              initial={reduced ? undefined : { x: "100%" }}
              animate={{ x: 0 }}
              exit={reduced ? undefined : { x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 260 }}
              className="absolute inset-y-0 end-0 flex w-[min(88vw,380px)] flex-col overflow-y-auto border-s border-[var(--c-border)] bg-[var(--c-surface)] p-5"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              <div className="mb-6 flex items-center justify-between">
                {logo}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn btn-ghost btn-sm !px-2"
                  aria-label="Close menu"
                >
                  <Icon name="close" size={22} />
                </button>
              </div>

              <ul className="flex flex-col gap-1">
                {items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={safeHref(item.href)}
                      target={item.openInNewTab ? "_blank" : undefined}
                      rel={item.openInNewTab ? "noopener noreferrer" : undefined}
                      className={cn(
                        "flex items-center justify-between rounded-[var(--radius-sm)] px-3.5 py-3.5 text-base font-medium transition-colors",
                        isActive(item.href)
                          ? "bg-[rgb(var(--c-primary-rgb)/0.12)] text-[var(--c-text)]"
                          : "text-[var(--c-muted)] hover:bg-[rgb(var(--c-text-rgb)/0.05)] hover:text-[var(--c-text)]",
                      )}
                    >
                      {item.label}
                      <Icon name="chevronRight" size={16} className="rtl-flip" />
                    </Link>
                    {item.children.length > 0 && (
                      <ul className="ms-3.5 border-s border-[var(--c-border)] ps-3">
                        {item.children.map((child) => (
                          <li key={child.id}>
                            <Link
                              href={safeHref(child.href)}
                              className="block py-2.5 text-sm text-[var(--c-muted)] transition-colors hover:text-[var(--c-text)]"
                            >
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>

              <div className="mt-auto space-y-3 pt-8">
                {localeSwitcher}
                <Link href={safeHref(ctaHref)} className="btn btn-primary w-full">
                  {ctaLabel}
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
