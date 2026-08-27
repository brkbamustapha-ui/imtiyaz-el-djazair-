"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useDeviceCapability, useIdleReady } from "./useDeviceCapability";

/** WebGL is code-split and only fetched when the device can actually use it. */
const HeroScene = dynamic(() => import("./HeroScene"), {
  ssr: false,
  loading: () => null,
});

/**
 * Pure-CSS stand-in used while the scene loads, on low-power devices, when the
 * visitor prefers reduced motion, and when the owner turns 3D off in
 * Admin → Appearance. It is styled to look intentional, not like a fallback.
 */
function GradientBackdrop() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <div
        className="glow-orb animate-float"
        style={{
          width: "46vw",
          height: "46vw",
          maxWidth: 620,
          maxHeight: 620,
          top: "-12%",
          insetInlineEnd: "-8%",
          background: "rgb(var(--c-primary-rgb) / 0.55)",
        }}
      />
      <div
        className="glow-orb"
        style={{
          width: "38vw",
          height: "38vw",
          maxWidth: 520,
          maxHeight: 520,
          bottom: "-16%",
          insetInlineStart: "-6%",
          background: "rgb(var(--c-accent-rgb) / 0.32)",
          animationDelay: "1.4s",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            "linear-gradient(rgb(var(--c-text-rgb)/0.10) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--c-text-rgb)/0.10) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, #000 20%, transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 40%, #000 20%, transparent 78%)",
        }}
      />
    </div>
  );
}

export function HeroBackground({
  enabled,
  intensity,
  primary,
  accent,
  align = "left",
}: {
  enabled: boolean;
  intensity: number;
  primary: string;
  accent: string;
  /** Where the hero copy sits, so the 3D composition moves out of its way. */
  align?: "left" | "center";
}) {
  const { tier, ready } = useDeviceCapability();
  const idle = useIdleReady();
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setWide(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // Unmount the canvas once the hero scrolls away so no GPU work happens
  // while the visitor reads the rest of the page.
  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "160px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const canRender3d = enabled && ready && idle && tier !== "low" && visible;
  const offsetX = align === "center" || !wide ? 0 : 4.6;

  return (
    <div ref={containerRef} className="absolute inset-0">
      <GradientBackdrop />
      {canRender3d && (
        <div className="absolute inset-0 opacity-[0.78] [contain:strict]">
          <HeroScene
            tier={tier}
            intensity={intensity}
            primary={primary}
            accent={accent}
            offsetX={offsetX}
          />
        </div>
      )}
      {/* Readability scrim: keeps the headline legible over whatever is behind it. */}
      <div
        aria-hidden
        className={
          align === "center"
            ? "absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_45%,rgb(7_11_20/0.82),transparent_75%)]"
            : "absolute inset-0 bg-[linear-gradient(100deg,var(--c-bg)_2%,rgb(7_11_20/0.86)_34%,rgb(7_11_20/0.35)_62%,transparent_88%)]"
        }
      />
    </div>
  );
}
