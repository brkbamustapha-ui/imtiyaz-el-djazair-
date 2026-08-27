import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The Imtiyaz El Djazair mark, inlined so it stays crisp at every size and can
 * be recoloured through CSS variables. Geometry traced from the artwork
 * supplied by the client.
 *
 * `simple` swaps the fingerprint ridges for a solid dot: below roughly 60px
 * tall the ridges are finer than a pixel and turn into a smudge.
 */
export function LogoMark({
  className,
  title = "Imtiyaz El Djazair",
  simple = false,
}: {
  className?: string;
  title?: string;
  simple?: boolean;
}) {
  return (
    <svg viewBox="0 0 145 257" className={className} role="img" aria-label={title}>
      <title>{title}</title>
      <path d="M4 84 H86 V166 A82 82 0 0 1 4 84 Z" fill="var(--logo-cyan, #22AEE4)" />
      <path d="M59 161 H141 V253 A82 82 0 0 1 59 171 Z" fill="var(--logo-navy, #2E5090)" />
      {simple ? (
        <>
          <circle cx="92" cy="42" r="38" fill="var(--logo-cyan, #22AEE4)" />
          <circle
            cx="92"
            cy="42"
            r="21"
            fill="none"
            stroke="var(--logo-dot-cut, #070b14)"
            strokeWidth="7"
          />
        </>
      ) : (
        <g
          fill="none"
          stroke="var(--logo-cyan, #22AEE4)"
          strokeWidth="2.9"
          strokeLinecap="round"
        >
          <path d="M75.10 73.79 A36 36 0 1 1 93.26 77.98" />
          <path d="M82.36 71.67 A31.2 31.2 0 1 1 96.34 72.90" />
          <path d="M75.03 62.22 A26.4 26.4 0 1 1 98.39 67.62" />
          <path d="M83.21 61.73 A21.6 21.6 0 1 1 100.09 62.03" />
          <path d="M79.52 53.24 A16.8 16.8 0 1 1 100.40 56.55" />
          <path d="M86.00 52.39 A12 12 0 1 1 99.39 51.46" />
          <path d="M97.35 46.82 A7.2 7.2 0 1 1 86.65 37.18 A3.2 3.2 0 1 1 94.52 43.97" />
        </g>
      )}
    </svg>
  );
}

export function Logo({
  siteName,
  tagline,
  logoUrl,
  className,
  compact = false,
}: {
  siteName: string;
  tagline: string;
  logoUrl?: string;
  className?: string;
  compact?: boolean;
}) {
  const isCustomUpload = Boolean(logoUrl) && !logoUrl!.startsWith("/assets/logo");

  if (isCustomUpload) {
    return (
      <span className={cn("flex items-center", className)}>
        <Image
          src={logoUrl!}
          alt={siteName}
          width={220}
          height={64}
          priority
          className="h-10 w-auto object-contain md:h-12"
        />
      </span>
    );
  }

  return (
    <span className={cn("flex items-center gap-3", className)}>
      <LogoMark className="h-10 w-auto shrink-0 md:h-14" title={siteName} simple />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[0.94rem] font-extrabold uppercase tracking-[0.13em] text-[var(--c-text)] md:text-[1.02rem]">
            {siteName}
          </span>
          <span className="mt-1 text-[0.56rem] font-medium uppercase tracking-[0.26em] text-[var(--c-muted)] md:text-[0.62rem]">
            {tagline}
          </span>
        </span>
      )}
    </span>
  );
}
