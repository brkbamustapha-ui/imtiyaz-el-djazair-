"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";

export type PartnerShot = { url: string; caption: string };

export type GalleryLabels = {
  open: string;
  close: string;
  prev: string;
  next: string;
  /** "{index} of {total}" — both placeholders are substituted. */
  counter: string;
};

/** How far a card sits from the one in front, as a share of the stage width. */
const STEP = 0.46;
/** Cards further than this from the centre are not drawn at all. */
const VISIBLE = 3;

/**
 * Depth arrangement for a card `offset` places from the front one.
 *
 * The neighbours turn away from the viewer and fall back in Z, so the run of
 * images reads as a physical stack rather than a filmstrip. The front card is
 * left square-on and unscaled — turning it too would make the artwork it
 * carries, which is mostly type, hard to read.
 */
function placement(offset: number) {
  const side = Math.sign(offset);
  const depth = Math.min(Math.abs(offset), VISIBLE);
  return {
    x: `${offset * STEP * 100}%`,
    z: -depth * 190,
    rotateY: side * -34 * Math.min(depth, 1.6),
    scale: 1 - depth * 0.06,
    opacity: depth > VISIBLE - 0.5 ? 0 : 1 - depth * 0.16,
    zIndex: 50 - Math.round(depth * 10),
  };
}

/**
 * Opens a partner's photographs over the page.
 *
 * `children` is the partner's card, rendered on the server; this only supplies
 * the click target and the overlay, so the card's markup lives in one place.
 */
export function PartnerGallery({
  name,
  shots,
  labels,
  children,
}: {
  name: string;
  shots: PartnerShot[];
  labels: GalleryLabels;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();
  const opener = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);
  const go = useCallback(
    (step: number) => setIndex((i) => (i + step + shots.length) % shots.length),
    [shots.length],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, close, go]);

  // Send focus back where it came from, or the reader is dropped at the top of
  // the page every time they close the gallery.
  useEffect(() => {
    if (!open) opener.current?.focus({ preventScroll: true });
  }, [open]);

  if (shots.length === 0) return <>{children}</>;

  const active = shots[index];
  const counter = labels.counter
    .replace("{index}", String(index + 1))
    .replace("{total}", String(shots.length));

  return (
    <>
      <button
        ref={opener}
        type="button"
        onClick={() => {
          setIndex(0);
          setOpen(true);
        }}
        aria-haspopup="dialog"
        aria-label={`${name} — ${labels.open}`}
        className="block h-full w-full cursor-pointer rounded-[var(--radius)] text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--c-accent)]"
      >
        {children}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={dialog}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={name}
            initial={reduced ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: 0.24 }}
            onClick={close}
            className="fixed inset-0 z-[95] flex flex-col bg-[rgb(var(--c-bg-rgb)/0.97)] backdrop-blur-xl outline-none"
          >
            <header className="relative z-[60] flex shrink-0 items-center justify-between gap-4 px-5 py-4 sm:px-8">
              <p className="truncate text-sm font-semibold tracking-wide text-[var(--c-text)]">
                {name}
              </p>
              <button
                type="button"
                onClick={close}
                aria-label={labels.close}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--c-text-rgb)/0.08)] text-[var(--c-text)] transition hover:bg-[rgb(var(--c-text-rgb)/0.18)]"
              >
                <Icon name="close" size={22} />
              </button>
            </header>

            {/* The stage. Perspective lives here so every card shares one vanishing
                point; without it each card gets its own and the depth reads flat. */}
            <div
              className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4"
              style={{ perspective: "1500px" }}
              onClick={(event) => event.stopPropagation()}
            >
              {shots.map((shot, position) => {
                const offset = position - index;
                if (Math.abs(offset) > VISIBLE) return null;
                const spot = placement(offset);
                const front = offset === 0;
                return (
                  <motion.figure
                    key={shot.url}
                    className="absolute top-1/2 flex h-[70vh] max-h-[680px] w-[min(88vw,560px)] -translate-y-1/2 flex-col"
                    style={{ transformStyle: "preserve-3d", zIndex: spot.zIndex }}
                    initial={false}
                    animate={
                      reduced
                        ? { x: front ? 0 : spot.x, opacity: front ? 1 : 0, zIndex: spot.zIndex }
                        : spot
                    }
                    transition={
                      reduced
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 190, damping: 26, mass: 0.9 }
                    }
                    onClick={() => !front && setIndex(position)}
                    aria-hidden={!front}
                  >
                    <div
                      className={`relative min-h-0 flex-1 overflow-hidden rounded-[var(--radius)] border border-[var(--c-border)] bg-[var(--c-surface)] ${
                        front ? "shadow-[0_50px_90px_-40px_rgba(0,0,0,0.85)]" : "cursor-pointer"
                      }`}
                    >
                      <Image
                        src={shot.url}
                        alt={shot.caption || name}
                        fill
                        sizes="(max-width: 640px) 88vw, 560px"
                        className="object-contain"
                        priority={front}
                      />
                    </div>
                  </motion.figure>
                );
              })}

              {shots.length > 1 && (
                <>
                  <Arrow side="start" label={labels.prev} icon="chevronLeft" onClick={() => go(-1)} />
                  <Arrow side="end" label={labels.next} icon="chevronRight" onClick={() => go(1)} />
                </>
              )}
            </div>

            <footer
              className="relative z-[60] shrink-0 px-5 pb-7 pt-4 text-center sm:px-8"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="min-h-[1.5rem] text-sm text-[var(--c-text)]">{active.caption}</p>
              <p className="mt-1 text-xs text-[var(--c-muted)]">{counter}</p>
              <div className="mt-4 flex items-center justify-center gap-2">
                {shots.map((shot, position) => (
                  <button
                    key={shot.url}
                    type="button"
                    onClick={() => setIndex(position)}
                    aria-label={shot.caption || `${position + 1}`}
                    aria-current={position === index}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      position === index
                        ? "w-7 bg-[var(--c-accent)]"
                        : "w-1.5 bg-[rgb(var(--c-text-rgb)/0.3)] hover:bg-[rgb(var(--c-text-rgb)/0.6)]"
                    }`}
                  />
                ))}
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Arrow({
  side,
  label,
  icon,
  onClick,
}: {
  side: "start" | "end";
  label: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`absolute top-1/2 z-[60] flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[rgb(var(--c-text-rgb)/0.08)] text-[var(--c-text)] backdrop-blur transition hover:bg-[rgb(var(--c-text-rgb)/0.2)] ${
        side === "start" ? "start-2 sm:start-6" : "end-2 sm:end-6"
      }`}
    >
      <Icon name={icon} size={24} className="rtl-flip" />
    </button>
  );
}
