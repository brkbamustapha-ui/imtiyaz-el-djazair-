"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "ied_visitor";

/**
 * First-party page-view ping. No third-party script, no personal data:
 * a random per-browser id, the path, and the referrer host.
 */
export function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;

    let key = "";
    try {
      key = localStorage.getItem(STORAGE_KEY) ?? "";
      if (!key) {
        key = crypto.randomUUID();
        localStorage.setItem(STORAGE_KEY, key);
      }
    } catch {
      key = "anon";
    }

    let referrer = "";
    try {
      referrer = document.referrer ? new URL(document.referrer).host : "";
    } catch {
      referrer = "";
    }

    const controller = new AbortController();
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, referrer, key }),
      signal: controller.signal,
      keepalive: true,
    }).catch(() => undefined);

    return () => controller.abort();
  }, [pathname]);

  return null;
}
