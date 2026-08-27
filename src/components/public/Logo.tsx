import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Renders the school's logo from the image file it was given.
 *
 * There is deliberately NO drawn fallback: the mark is not reproduced in SVG,
 * CSS or type anywhere in this codebase. When no file has been supplied the
 * component shows the school name as ordinary text, so the absence is obvious
 * rather than papered over with a stand-in.
 *
 * Supply the file from Admin -> Site settings -> Branding, or drop it into
 * /public/assets/logo (see the README in that folder).
 */
export function SiteLogo({
  src,
  siteName,
  tagline,
  className,
  imageClassName = "h-10 w-auto md:h-12",
  showWordmark = true,
  priority = false,
}: {
  src: string | null;
  siteName: string;
  tagline?: string;
  className?: string;
  imageClassName?: string;
  showWordmark?: boolean;
  priority?: boolean;
}) {
  if (src) {
    return (
      <span className={cn("flex items-center", className)}>
        <Image
          src={src}
          alt={siteName}
          width={320}
          height={96}
          priority={priority}
          className={cn("w-auto object-contain", imageClassName)}
          unoptimized={src.endsWith(".svg")}
        />
      </span>
    );
  }

  return (
    <span className={cn("flex flex-col leading-none", className)}>
      <span className="font-display text-[0.94rem] font-extrabold uppercase tracking-[0.13em] text-[var(--c-text)] md:text-[1.02rem]">
        {siteName}
      </span>
      {showWordmark && tagline && (
        <span className="mt-1 text-[0.56rem] font-medium uppercase tracking-[0.26em] text-[var(--c-muted)] md:text-[0.62rem]">
          {tagline}
        </span>
      )}
    </span>
  );
}
