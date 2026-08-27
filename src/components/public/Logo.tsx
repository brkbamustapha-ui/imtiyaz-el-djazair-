import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The Imtiyaz El Djazair mark, inlined so it is crisp at every size and can be
 * recoloured by CSS. If the owner uploads a logo in Admin → Settings → General,
 * that image is used instead.
 */
export function LogoMark({ className, title = "Imtiyaz El Djazair" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 96 194" className={className} role="img" aria-label={title}>
      <title>{title}</title>
      <defs>
        <mask id="ied-fp-mask">
          <rect width="96" height="194" fill="#fff" />
          <g fill="none" stroke="#000" strokeWidth="3.1" strokeLinecap="round">
            <circle cx="56" cy="34" r="24.5" />
            <circle cx="56" cy="34" r="18.5" />
            <circle cx="56" cy="34" r="12.5" />
            <circle cx="56" cy="34" r="6.5" />
          </g>
          <path
            d="M56 6 L64 18 L58 34 L66 48 L56 62"
            fill="none"
            stroke="#000"
            strokeWidth="3.4"
            strokeLinejoin="round"
          />
        </mask>
      </defs>
      <path d="M12 122 H76 A64 64 0 0 1 12 186 Z" fill="var(--logo-navy, #2C4E8F)" />
      <path d="M12 76 H72 V136 A60 60 0 0 1 12 76 Z" fill="var(--logo-cyan, #17AEE0)" />
      <circle cx="56" cy="34" r="28" fill="var(--logo-cyan, #17AEE0)" mask="url(#ied-fp-mask)" />
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
          className="h-9 w-auto object-contain md:h-11"
        />
      </span>
    );
  }

  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className="h-9 w-auto shrink-0 md:h-11" title={siteName} />
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
