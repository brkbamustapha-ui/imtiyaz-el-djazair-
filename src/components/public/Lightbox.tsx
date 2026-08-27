"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";

export type LightboxImage = { id: string; url: string; title: string; album: string };

export function GalleryGrid({ images }: { images: LightboxImage[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const reduced = useReducedMotion();

  const close = useCallback(() => setIndex(null), []);
  const next = useCallback(
    () => setIndex((current) => (current === null ? null : (current + 1) % images.length)),
    [images.length],
  );
  const prev = useCallback(
    () =>
      setIndex((current) =>
        current === null ? null : (current - 1 + images.length) % images.length,
      ),
    [images.length],
  );

  useEffect(() => {
    if (index === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [index, close, next, prev]);

  if (images.length === 0) return null;
  const active = index === null ? null : images[index];

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((image, position) => (
          <li key={image.id}>
            <button
              type="button"
              onClick={() => setIndex(position)}
              className="group relative block h-full w-full overflow-hidden rounded-[var(--radius-sm)] border border-[var(--c-border)]"
              aria-label={`${image.title || image.album} — open larger view`}
            >
              {/* One uniform, slightly upright tile: the school's photographs are
                  portrait, and a landscape grid cropped the tops off them. */}
              <span className="block aspect-[4/5]">
                <Image
                  src={image.url}
                  alt={image.title || image.album}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.07]"
                />
              </span>
              <span
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />
              {image.title && (
                <span
                  aria-hidden
                  className="absolute inset-x-3 bottom-3 translate-y-2 text-start text-xs font-medium text-white opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100"
                >
                  {image.title}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <AnimatePresence>
        {active && (
          <motion.div
            initial={reduced ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/92 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label={active.title || "Image"}
            onClick={close}
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute end-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            >
              <Icon name="close" size={22} />
            </button>

            {images.length > 1 && (
              <>
                <NavButton side="start" onClick={prev} label="Previous image" icon="chevronLeft" />
                <NavButton side="end" onClick={next} label="Next image" icon="chevronRight" />
              </>
            )}

            <motion.figure
              key={active.id}
              initial={reduced ? undefined : { scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="relative max-h-[86vh] w-full max-w-5xl"
              onClick={(event) => event.stopPropagation()}
            >
              {/* object-contain inside a tall frame: portrait photographs are
                  shown whole and are never scaled past their real resolution.
                  The frame is capped at max-w-5xl, so `sizes` tops out at 1024px
                  rather than 90vw — a wide monitor would otherwise fetch a 1920px
                  variant to paint an image this frame can never show that large. */}
              <div className="relative mx-auto h-[72vh] w-full">
                <Image
                  src={active.url}
                  alt={active.title || active.album}
                  fill
                  sizes="(max-width: 1024px) 92vw, 1024px"
                  className="rounded-[var(--radius)] object-contain"
                />
              </div>
              {active.title && (
                <figcaption className="mt-3 text-center text-sm text-white/80">
                  {active.title}
                  <span className="ms-2 text-white/40">
                    {index !== null ? `${index + 1} / ${images.length}` : ""}
                  </span>
                </figcaption>
              )}
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function NavButton({
  side,
  onClick,
  label,
  icon,
}: {
  side: "start" | "end";
  onClick: () => void;
  label: string;
  icon: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`absolute top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 ${
        side === "start" ? "start-3" : "end-3"
      }`}
    >
      <Icon name={icon} size={24} className="rtl-flip" />
    </button>
  );
}
