"use client";

import { useRef, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Subtle 3D tilt + a light that follows the cursor.
 * Disabled on coarse pointers so it never interferes with tapping.
 */
export function TiltCard({
  children,
  className,
  intensity = 6,
}: {
  children: ReactNode;
  className?: string;
  intensity?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const node = ref.current;
    if (!node || reduced) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const rect = node.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    node.style.transform = `perspective(900px) rotateX(${(0.5 - py) * intensity}deg) rotateY(${(px - 0.5) * intensity}deg) translateY(-6px)`;
    node.style.setProperty("--mx", `${px * 100}%`);
    node.style.setProperty("--my", `${py * 100}%`);
  };

  const handleLeave = () => {
    const node = ref.current;
    if (!node) return;
    node.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0px)";
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={cn("relative transition-transform duration-500 ease-out", className)}
      style={{ transformStyle: "preserve-3d" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 [background:radial-gradient(420px_circle_at_var(--mx,50%)_var(--my,50%),rgb(var(--c-primary-rgb)/0.14),transparent_62%)] group-hover:opacity-100"
        style={{ borderRadius: "inherit" }}
      />
      {children}
    </div>
  );
}
