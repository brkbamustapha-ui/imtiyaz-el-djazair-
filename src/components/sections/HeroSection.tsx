import { lt } from "@/lib/localized-field";
import Image from "next/image";
import { getStats } from "@/server/content";
import { getSetting } from "@/lib/settings";
import { HeroBackground } from "@/components/3d/HeroBackground";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { Counter } from "@/components/ui/Counter";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { cn, safeHref } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { bool, cta, ls, num, str, type SectionProps } from "./helpers";

export async function HeroSection({ data, locale, sectionId }: SectionProps) {
  const appearance = await getSetting("appearance");
  const backgroundType = str(data, "backgroundType", "3d");
  const align = str(data, "align", "left");
  const primaryCta = cta(data, "primaryCta");
  const secondaryCta = cta(data, "secondaryCta");
  const showStats = bool(data, "showStats", true);
  const stats = showStats ? (await getStats()).slice(0, 4) : [];

  const use3d = backgroundType === "3d" && appearance.effects3dEnabled;
  const intensity = num(data, "particleIntensity", 0.7) * appearance.effects3dIntensity;
  const overlay = num(data, "overlayOpacity", 0.35);

  return (
    <section
      id={sectionId}
      className="relative isolate flex min-h-[92svh] items-center overflow-hidden pb-20 pt-32 md:min-h-screen md:pb-24 md:pt-36"
      style={
        backgroundType === "color"
          ? { backgroundColor: str(data, "backgroundColor", "#233d74") }
          : backgroundType === "gradient"
            ? {
                backgroundImage:
                  "radial-gradient(120% 90% at 78% 8%, rgb(var(--c-primary-rgb)/0.30), transparent 58%), radial-gradient(90% 80% at 12% 92%, rgb(var(--c-accent-rgb)/0.20), transparent 60%), var(--c-bg)",
              }
            : undefined
      }
    >
      {use3d && (
        <HeroBackground
          enabled
          intensity={intensity}
          primary={appearance.colors.primary}
          accent={appearance.colors.accent}
          background={appearance.colors.background}
          align={align === "center" ? "center" : "left"}
        />
      )}

      {backgroundType === "image" && str(data, "backgroundImage") && (
        // With the copy on one side, the photograph takes the other and fades
        // into the page rather than lying under the headline. Stretched across
        // the full width it had to zoom to cover, which cropped the heads off
        // the school's own banner and put the title across a face. Centred
        // copy still gets a full-bleed image behind it.
        <div
          aria-hidden
          className={cn(
            "absolute inset-y-0",
            align === "center" ? "inset-x-0" : "end-0 w-full sm:w-[74%] lg:w-[62%]",
          )}
          style={
            align === "center"
              ? undefined
              : {
                  maskImage:
                    "linear-gradient(to right, transparent 0%, rgb(0 0 0 / 0.35) 14%, #000 42%)",
                  WebkitMaskImage:
                    "linear-gradient(to right, transparent 0%, rgb(0 0 0 / 0.35) 14%, #000 42%)",
                }
          }
        >
          <Image
            src={str(data, "backgroundImage")}
            alt=""
            fill
            priority
            sizes={align === "center" ? "100vw" : "(max-width: 640px) 100vw, 70vw"}
            className="object-cover"
            style={{ objectPosition: str(data, "backgroundPosition", "center") }}
          />
        </div>
      )}

      {backgroundType === "video" && str(data, "backgroundVideo") && (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={str(data, "backgroundVideo")}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden
        />
      )}

      {(backgroundType === "image" || backgroundType === "video") && (
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            // Tinted with the page's own background rather than black: the
            // school's artwork is deep blue, and a black scrim over it turned
            // the blue grey and left a visible seam at the edge of the photo.
            // With left-aligned copy the tint runs sideways, so the headline
            // gets a solid ground while the photograph stays clear.
            background:
              align === "center"
                ? `linear-gradient(to bottom, rgb(var(--c-bg-rgb) / ${overlay}), rgb(var(--c-bg-rgb) / ${Math.min(1, overlay + 0.35)}))`
                : `linear-gradient(to right, rgb(var(--c-bg-rgb) / ${Math.min(1, overlay + 0.45)}) 0%, rgb(var(--c-bg-rgb) / ${overlay * 0.8}) 46%, rgb(var(--c-bg-rgb) / ${overlay * 0.25}) 100%)`,
          }}
        />
      )}

      {/* On a phone the photograph runs the full width, so the sideways tint
          that carries the headline on a wide screen does nothing for it. This
          one only exists below the `sm` breakpoint. */}
      {backgroundType === "image" && str(data, "backgroundImage") && align !== "center" && (
        <div
          aria-hidden
          className="absolute inset-0 sm:hidden"
          style={{
            background: `linear-gradient(to bottom, rgb(var(--c-bg-rgb) / 0.35) 0%, rgb(var(--c-bg-rgb) / 0.72) 45%, rgb(var(--c-bg-rgb) / 0.88) 100%)`,
          }}
        />
      )}

      <div className="container-x relative z-10">
        <div className={cn("max-w-4xl", align === "center" && "mx-auto text-center")}>
          {ls(data, "badge", locale) && (
            <Reveal direction="fade">
              <p
                className={cn(
                  "glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-[0.7rem] font-medium tracking-wide text-[var(--c-muted)] sm:text-xs",
                  align === "center" && "mx-auto",
                )}
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--c-accent)] opacity-75 [animation:pulse-ring_2.4s_ease-out_infinite]" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--c-accent)]" />
                </span>
                {ls(data, "badge", locale)}
              </p>
            </Reveal>
          )}

          <Reveal delay={0.08}>
            <h1 className="h-display mt-6 text-balance">
              <span className="text-gradient">{ls(data, "title", locale)}</span>
            </h1>
          </Reveal>

          {ls(data, "subtitle", locale) && (
            <Reveal delay={0.16}>
              <p className="mt-4 text-[0.82rem] font-semibold uppercase tracking-[0.34em] text-[var(--c-accent)] sm:text-sm">
                {ls(data, "subtitle", locale)}
              </p>
            </Reveal>
          )}

          {ls(data, "description", locale) && (
            <Reveal delay={0.24}>
              <p
                className={cn(
                  "lead mt-7 max-w-xl text-pretty text-base sm:text-lg",
                  align === "center" && "mx-auto",
                )}
              >
                {ls(data, "description", locale)}
              </p>
            </Reveal>
          )}

          {(primaryCta || secondaryCta) && (
            <Reveal delay={0.32}>
              <div
                className={cn(
                  "mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap",
                  align === "center" && "sm:justify-center",
                )}
              >
                {primaryCta && (
                  <MagneticButton href={safeHref(primaryCta.href)} variant="primary">
                    {t(primaryCta.label, locale)}
                    <Icon name="arrowRight" size={17} className="rtl-flip" />
                  </MagneticButton>
                )}
                {secondaryCta && (
                  <MagneticButton href={safeHref(secondaryCta.href)} variant="secondary">
                    {t(secondaryCta.label, locale)}
                  </MagneticButton>
                )}
              </div>
            </Reveal>
          )}

          {stats.length > 0 && (
            <Reveal delay={0.42}>
              <dl
                className={cn(
                  "mt-14 grid max-w-2xl grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-4",
                  align === "center" && "mx-auto",
                )}
              >
                {stats.map((stat) => (
                  <div key={stat.id}>
                    <dt className="sr-only">{lt(stat.label, locale)}</dt>
                    <dd className="font-display text-2xl font-extrabold text-[var(--c-text)] sm:text-3xl">
                      <Counter value={stat.value} suffix={stat.suffix} />
                    </dd>
                    <p className="mt-1.5 text-[0.72rem] uppercase tracking-[0.14em] text-[var(--c-muted)]">
                      {lt(stat.label, locale)}
                    </p>
                  </div>
                ))}
              </dl>
            </Reveal>
          )}
        </div>
      </div>

      {bool(data, "showScrollHint", true) && (
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-7 z-10 flex justify-center"
        >
          <span className="flex h-9 w-[22px] items-start justify-center rounded-full border border-[rgb(var(--c-text-rgb)/0.22)] p-1.5">
            <span className="h-1.5 w-1 rounded-full bg-[var(--c-accent)] animate-float" />
          </span>
        </div>
      )}

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[var(--c-bg)]"
      />
    </section>
  );
}
