"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

export type CampClip = { src: string; poster: string; title: string; caption: string };

type Labels = {
  play: string;
  pause: string;
  fullscreen: string;
  exitFullscreen: string;
  /** e.g. "Clip {index} of {total}" — a template, because a function cannot
   *  cross the server/client boundary. */
  clipTemplate: string;
  previous: string;
  next: string;
};

function clipLabel(template: string, index: number, total: number): string {
  return template
    .replace("{index}", String(index))
    .replace("{total}", String(total));
}

/**
 * Featured-stage player: one large clip plus a rail of covers.
 *
 * Nothing but the cover images downloads until the visitor presses play — the
 * four camp clips are ~9 MB together, which is not something to spend on a
 * scroll-past. `preload="none"` on the <video> is what enforces that; switching
 * clips swaps the `src` and only loads the new one on demand.
 */
export function SummerCampPlayer({
  clips,
  labels,
}: {
  clips: CampClip[];
  labels: Labels;
}) {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [isFullscreen, setFullscreen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion();

  const clip = clips[active];

  const play = useCallback(() => {
    setPlaying(true);
    window.requestAnimationFrame(() => void videoRef.current?.play().catch(() => undefined));
  }, []);

  const select = useCallback((index: number) => {
    setActive(index);
    setPlaying(false);
  }, []);

  const step = useCallback(
    (delta: number) => select((active + delta + clips.length) % clips.length),
    [active, clips.length, select],
  );

  const toggleFullscreen = useCallback(() => {
    const node = stageRef.current;
    if (!node) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    } else {
      void node.requestFullscreen?.().catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  if (!clip) return null;

  return (
    <div className="mt-12">
      {/* ---------------------------------------------------------------- stage */}
      <div
        ref={stageRef}
        className={cn(
          "group relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--c-border)] bg-black",
          "shadow-[0_30px_80px_-40px_rgb(0_0_0/calc(var(--shadow-strength)*1.4))]",
          isFullscreen && "flex items-center justify-center rounded-none border-0",
        )}
      >
        <div
          className={cn(
            "relative w-full",
            // Portrait phone footage: give it a tall frame on mobile and a
            // cinematic one on desktop, then letterbox rather than crop.
            isFullscreen ? "h-full" : "aspect-[4/5] sm:aspect-video",
          )}
        >
          {playing ? (
            <video
              key={clip.src}
              ref={videoRef}
              src={clip.src}
              poster={clip.poster || undefined}
              controls
              playsInline
              preload="metadata"
              onEnded={() => setPlaying(false)}
              className="h-full w-full bg-black object-contain"
              aria-label={clip.title}
            />
          ) : (
            <>
              {clip.poster ? (
                <Image
                  key={clip.poster}
                  src={clip.poster}
                  alt=""
                  fill
                  priority={false}
                  sizes="(max-width: 1024px) 100vw, 1100px"
                  className={cn(
                    "object-cover",
                    !reduced && "transition-transform duration-[1200ms] ease-out group-hover:scale-[1.03]",
                  )}
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-[var(--c-surface-2)]">
                  <Icon name="image" size={32} className="text-[var(--c-muted)]" />
                </span>
              )}

              <span
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10"
              />

              <button
                type="button"
                onClick={play}
                className="absolute inset-0 flex h-full w-full items-center justify-center"
                aria-label={`${labels.play}: ${clip.title}`}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex h-20 w-20 items-center justify-center rounded-full",
                    "border border-white/35 bg-black/35 backdrop-blur-md",
                    !reduced &&
                      "transition-transform duration-500 ease-out group-hover:scale-110 motion-safe:animate-[camp-pulse_3.2s_ease-in-out_infinite]",
                  )}
                >
                  <svg width="24" height="26" viewBox="0 0 20 22" className="ms-1 fill-white">
                    <path d="M0 0 L20 11 L0 22 Z" />
                  </svg>
                </span>
              </button>

              {/* Caption + counter, only while the poster is showing so it never
                  covers the native video controls. */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-5 sm:p-7">
                <div className="max-w-lg">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[var(--c-accent-soft)]">
                    {clipLabel(labels.clipTemplate, active + 1, clips.length)}
                  </p>
                  <p className="mt-2 font-display text-xl font-bold text-white sm:text-2xl">
                    {clip.title}
                  </p>
                  {clip.caption && (
                    <p className="mt-1.5 text-sm leading-relaxed text-white/70">{clip.caption}</p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ------------------------------------------------------- controls */}
          <div className="absolute end-4 top-4 flex gap-2">
            {clips.length > 1 && (
              <>
                <StageButton onClick={() => step(-1)} label={labels.previous}>
                  <Icon name="arrowRight" size={16} className="rotate-180 rtl-flip" />
                </StageButton>
                <StageButton onClick={() => step(1)} label={labels.next}>
                  <Icon name="arrowRight" size={16} className="rtl-flip" />
                </StageButton>
              </>
            )}
            <StageButton
              onClick={toggleFullscreen}
              label={isFullscreen ? labels.exitFullscreen : labels.fullscreen}
            >
              <Icon name={isFullscreen ? "close" : "expand"} size={16} />
            </StageButton>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------- thumbnails */}
      {clips.length > 1 && (
        <ul
          className={cn(
            "mt-5 grid gap-3",
            clips.length >= 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3",
          )}
        >
          {clips.map((item, index) => (
            <li key={`${item.src}-${index}`}>
              <button
                type="button"
                onClick={() => select(index)}
                aria-current={index === active}
                className={cn(
                  "group/thumb relative block w-full overflow-hidden rounded-[var(--radius-sm)]",
                  "border transition-all duration-300",
                  index === active
                    ? "border-[var(--c-accent)] shadow-[0_0_0_1px_var(--c-accent)]"
                    : "border-[var(--c-border)] hover:border-[var(--c-primary)]",
                )}
              >
                <span className="block aspect-video">
                  {item.poster ? (
                    <Image
                      src={item.poster}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 50vw, 25vw"
                      className={cn(
                        "object-cover",
                        index === active ? "opacity-100" : "opacity-70",
                        !reduced &&
                          "transition-all duration-500 group-hover/thumb:scale-105 group-hover/thumb:opacity-100",
                      )}
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-[var(--c-surface-2)]">
                      <Icon name="image" size={18} className="text-[var(--c-muted)]" />
                    </span>
                  )}
                </span>
                <span
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"
                />
                <span className="absolute inset-x-0 bottom-0 line-clamp-2 p-2.5 text-start text-[0.7rem] font-medium leading-snug text-white sm:text-xs">
                  {item.title}
                </span>
                <AnimatePresence>
                  {index === active && !reduced && (
                    <motion.span
                      layoutId="camp-active"
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 h-0.5 bg-[var(--c-accent)]"
                    />
                  )}
                </AnimatePresence>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StageButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full",
        "border border-white/25 bg-black/40 text-white backdrop-blur-md",
        "transition-colors hover:border-[var(--c-accent)] hover:text-[var(--c-accent)]",
      )}
    >
      {children}
    </button>
  );
}
