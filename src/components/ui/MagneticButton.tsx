"use client";

import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Button/link that leans very slightly towards the pointer.
 * Pointer-only: touch devices and reduced-motion users get a normal button.
 */
export function MagneticButton({
  href,
  children,
  className,
  variant = "primary",
  onClick,
  type = "button",
  ariaLabel,
}: {
  href?: string;
  children: ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
  onClick?: () => void;
  type?: "button" | "submit";
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  const handleMove = (event: React.MouseEvent) => {
    const node = ref.current;
    if (!node || reduced) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const rect = node.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    node.style.transform = `translate(${x * 0.14}px, ${y * 0.2}px)`;
  };

  const handleLeave = () => {
    const node = ref.current;
    if (node) node.style.transform = "translate(0px, 0px)";
  };

  const classes = cn("btn", `btn-${variant}`, className);

  if (href) {
    return (
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        className={classes}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        aria-label={ariaLabel}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={type}
      className={classes}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
