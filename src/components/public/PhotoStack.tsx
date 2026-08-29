"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

export type StackShot = { url: string; caption?: string };

/** How long each photograph holds before the next one comes forward. */
const HOLD_MS = 5200;

/**
 * A single frame that cycles through several photographs.
 *
 * The section it sits in has one image slot and a tall frame, so a row of
 * thumbnails would not fit it. Each photograph instead takes the whole frame
 * in turn, easing back in Z as the next one arrives, which keeps the frame's
 * proportions and shows every picture at a usable size.
 */
export function PhotoStack({
  shots,
  alt,
  sizes,
}: {
  shots: StackShot[];
  alt: string;
  sizes: string;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    // One photograph, or a visitor who asked for less motion: nothing to cycle.
    if (shots.length < 2 || reduced || paused) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % shots.length), HOLD_MS);
    return () => window.clearInterval(timer);
  }, [shots.length, reduced, paused]);

  if (shots.length === 0) return null;
  const active = shots[Math.min(index, shots.length - 1)];

  return (
    <div
      className="absolute inset-0"
      style={{ perspective: "1200px" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={active.url}
          className="absolute inset-0"
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.06, z: -60 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1, z: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.98, z: -40 }}
          transition={{ duration: reduced ? 0.2 : 1.1, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformStyle: "preserve-3d" }}
        >
          <Image
            src={active.url}
            alt={active.caption || alt}
            fill
            sizes={sizes}
            className="object-cover"
            priority={index === 0}
          />
        </motion.div>
      </AnimatePresence>

      {shots.length > 1 && (
        <div className="absolute inset-x-0 bottom-3 z-10 flex items-center justify-center gap-1.5">
          {shots.map((shot, position) => (
            <button
              key={shot.url}
              type="button"
              onClick={() => setIndex(position)}
              aria-label={shot.caption || `Photo ${position + 1}`}
              aria-current={position === index}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                position === index
                  ? "w-6 bg-[var(--c-accent)]"
                  : "w-1.5 bg-white/45 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
