"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { safeHref } from "@/lib/utils";

export function PopupHost({
  id,
  title,
  body,
  imageUrl,
  ctaLabel,
  ctaHref,
  frequency,
  delayMs,
}: {
  id: string;
  title: string;
  body: string;
  imageUrl: string;
  ctaLabel: string;
  ctaHref: string;
  frequency: string;
  delayMs: number;
}) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const storageKey = `ied_popup_${id}`;

  useEffect(() => {
    if (frequency !== "ALWAYS") {
      try {
        const seenAt = Number(localStorage.getItem(storageKey) ?? 0);
        if (frequency === "ONCE" && seenAt > 0) return;
        if (frequency === "DAILY" && Date.now() - seenAt < 86_400_000) return;
      } catch {
        // storage blocked — fall through and show it
      }
    }
    const timer = window.setTimeout(() => setOpen(true), Math.max(500, delayMs));
    return () => window.clearTimeout(timer);
  }, [frequency, delayMs, storageKey]);

  const dismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(storageKey, String(Date.now()));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={reduced ? undefined : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? undefined : { opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/65 p-4 backdrop-blur-sm sm:items-center"
          onClick={dismiss}
          role="dialog"
          aria-modal="true"
          aria-labelledby="popup-title"
        >
          <motion.div
            initial={reduced ? undefined : { y: 40, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={reduced ? undefined : { y: 30, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            onClick={(event) => event.stopPropagation()}
            className="card relative w-full max-w-md overflow-hidden"
            style={{ background: "var(--c-surface-2)" }}
          >
            <button
              type="button"
              onClick={dismiss}
              aria-label="Close"
              className="absolute end-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/60"
            >
              <Icon name="close" size={18} />
            </button>

            {imageUrl && (
              <div className="relative aspect-[16/9] w-full">
                <Image src={imageUrl} alt="" fill sizes="440px" className="object-cover" />
              </div>
            )}

            <div className="p-7">
              <h2 id="popup-title" className="h3">
                {title}
              </h2>
              {body && <p className="mt-3 text-sm leading-relaxed text-[var(--c-muted)]">{body}</p>}
              {ctaLabel && (
                <Link href={safeHref(ctaHref)} onClick={dismiss} className="btn btn-primary mt-6 w-full">
                  {ctaLabel}
                </Link>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
