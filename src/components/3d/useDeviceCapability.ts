"use client";

import { useEffect, useState } from "react";

export type DeviceTier = "high" | "medium" | "low";

type NavigatorWithHints = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
};

/**
 * Decides how much 3D a device should be asked to render.
 * "low" means: don't mount WebGL at all — show the CSS fallback instead.
 */
export function useDeviceCapability(): {
  tier: DeviceTier;
  ready: boolean;
  reducedMotion: boolean;
} {
  const [tier, setTier] = useState<DeviceTier>("medium");
  const [ready, setReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const nav = navigator as NavigatorWithHints;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = nav.connection?.saveData === true;
    const slowNetwork = ["slow-2g", "2g", "3g"].includes(nav.connection?.effectiveType ?? "");
    const cores = nav.hardwareConcurrency ?? 4;
    const memory = nav.deviceMemory ?? 4;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const narrow = window.innerWidth < 768;

    setReducedMotion(prefersReduced);

    if (prefersReduced || saveData || slowNetwork || cores <= 2 || memory <= 2) {
      setTier("low");
    } else if (coarse || narrow || cores <= 4 || memory <= 4) {
      setTier("medium");
    } else {
      setTier("high");
    }
    setReady(true);
  }, []);

  return { tier, ready, reducedMotion };
}

/** True once the browser has gone idle — used to defer mounting the canvas. */
export function useIdleReady(delay = 300): boolean {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    type IdleWindow = Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    const win = window as IdleWindow;
    if (typeof win.requestIdleCallback === "function") {
      const id = win.requestIdleCallback(() => setIdle(true), { timeout: 1600 });
      return () => window.cancelIdleCallback?.(id);
    }
    const timer = window.setTimeout(() => setIdle(true), delay);
    return () => window.clearTimeout(timer);
  }, [delay]);
  return idle;
}
