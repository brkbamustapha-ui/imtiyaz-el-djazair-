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
          ? { backgroundColor: str(data, "backgroundColor", "#070b14") }
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
          align={align === "center" ? "center" : "left"}
        />
      )}

      {backgroundType === "image" && str(data, "backgroundImage") && (
        <Image
          src={str(data, "backgroundImage")}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
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
            background: `linear-gradient(to bottom, rgb(0 0 0 / ${overlay}), rgb(0 0 0 / ${Math.min(1, overlay + 0.35)}))`,
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
