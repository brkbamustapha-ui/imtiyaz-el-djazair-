"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

/**
 * Poster-first video card.
 *
 * The <video> element carries `preload="none"`, so a visitor who never presses
 * play downloads nothing but the cover image — three clips would otherwise cost
 * several megabytes on page load.
 */
export function VideoCard({
  src,
  poster,
  title,
  playLabel,
}: {
  src: string;
  poster: string;
  title: string;
  playLabel: string;
}) {
  const [started, setStarted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const start = () => {
    setStarted(true);
    // The element only exists after the first render with `started`.
    window.requestAnimationFrame(() => void videoRef.current?.play().catch(() => undefined));
  };

  return (
    <figure className="card group relative overflow-hidden">
      <div className="relative aspect-[3/4] w-full bg-black sm:aspect-[4/5]">
        {started ? (
          <video
            ref={videoRef}
            src={src}
            poster={poster || undefined}
            controls
            playsInline
            preload="metadata"
            className="h-full w-full object-contain"
            aria-label={title}
          />
        ) : (
          <button
            type="button"
            onClick={start}
            className="absolute inset-0 h-full w-full"
            aria-label={`${playLabel}: ${title}`}
          >
            {poster ? (
              <Image
                src={poster}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-[var(--c-surface-2)]">
                <Icon name="image" size={28} className="text-[var(--c-muted)]" />
              </span>
            )}

            <span
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent"
            />

            <span
              aria-hidden
              className={cn(
                "absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center",
                "rounded-full border border-white/30 bg-black/35 backdrop-blur-sm",
                "transition-transform duration-300 group-hover:scale-110",
              )}
            >
              {/* Play triangle, nudged right so it reads as centred. */}
              <svg width="20" height="22" viewBox="0 0 20 22" className="ms-1 fill-white">
                <path d="M0 0 L20 11 L0 22 Z" />
              </svg>
            </span>
          </button>
        )}
      </div>

      {title && (
        <figcaption className="px-5 py-4 text-sm font-medium text-[var(--c-text)]">
          {title}
        </figcaption>
      )}
    </figure>
  );
}
