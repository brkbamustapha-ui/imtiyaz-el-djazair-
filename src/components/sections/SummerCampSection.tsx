import { Reveal, RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { TiltCard } from "@/components/ui/TiltCard";
import { Icon } from "@/components/ui/Icon";
import { SummerCampPlayer, type CampClip } from "@/components/public/SummerCampPlayer";
import { cn, safeHref, sanitizeRichText } from "@/lib/utils";
import { t, type Locale, type LocalizedText } from "@/lib/i18n";
import { arr, cta, ls, str, SectionHeading, SectionShell, type SectionProps } from "./helpers";

type Clip = {
  title?: LocalizedText | string;
  caption?: LocalizedText | string;
  src?: string;
  poster?: string;
};

type Highlight = { title?: LocalizedText | string; text?: LocalizedText | string; icon?: string };

const LABELS: Record<string, Record<string, string>> = {
  en: {
    play: "Play the video",
    pause: "Pause",
    fullscreen: "Full screen",
    exitFullscreen: "Exit full screen",
    previous: "Previous clip",
    next: "Next clip",
    clip: "Clip",
    of: "of",
  },
  fr: {
    play: "Lire la vidéo",
    pause: "Pause",
    fullscreen: "Plein écran",
    exitFullscreen: "Quitter le plein écran",
    previous: "Vidéo précédente",
    next: "Vidéo suivante",
    clip: "Vidéo",
    of: "sur",
  },
  ar: {
    play: "تشغيل الفيديو",
    pause: "إيقاف مؤقت",
    fullscreen: "ملء الشاشة",
    exitFullscreen: "الخروج من ملء الشاشة",
    previous: "المقطع السابق",
    next: "المقطع التالي",
    clip: "مقطع",
    of: "من",
  },
};

function labelsFor(locale: Locale) {
  const l = LABELS[locale] ?? LABELS.en;
  return {
    play: l.play,
    pause: l.pause,
    fullscreen: l.fullscreen,
    exitFullscreen: l.exitFullscreen,
    previous: l.previous,
    next: l.next,
    clipTemplate: `${l.clip} {index} ${l.of} {total}`,
  };
}

/**
 * The Summer Camp block: one large stage the visitor drives, a rail of covers,
 * and an optional row of highlight cards.
 *
 * Everything shown here is section data, so the owner can retitle it, rewrite
 * the copy, reorder the clips or swap the files from Website Builder without a
 * deploy. It renders nothing at all when no clip has a source, rather than
 * leaving an empty frame on the page.
 */
export function SummerCampSection({ data, locale, sectionId }: SectionProps) {
  const clips: CampClip[] = arr<Clip>(data, "videos")
    .filter((clip) => Boolean(clip.src))
    .map((clip) => ({
      src: clip.src ?? "",
      poster: clip.poster ?? "",
      title: t(clip.title, locale),
      caption: t(clip.caption, locale),
    }));

  const highlights = arr<Highlight>(data, "highlights").filter(
    (item) => t(item.title, locale) || t(item.text, locale),
  );
  const body = ls(data, "body", locale);
  const button = cta(data, "primaryCta");
  const secondary = cta(data, "secondaryCta");
  const tone = str(data, "tone", "surface") === "surface" ? "surface" : "default";

  if (clips.length === 0 && highlights.length === 0 && !body) return null;

  return (
    <SectionShell id={sectionId} tone={tone} className="overflow-hidden">
      {/* Depth behind the block — two soft orbs, no extra DOM cost on mobile. */}
      <div
        aria-hidden
        className="glow-orb hidden md:block"
        style={{
          width: 620,
          height: 620,
          insetInlineEnd: "-14%",
          top: "-22%",
          background: "rgb(var(--c-accent-rgb) / 0.13)",
        }}
      />
      <div
        aria-hidden
        className="glow-orb hidden md:block"
        style={{
          width: 520,
          height: 520,
          insetInlineStart: "-12%",
          bottom: "-26%",
          background: "rgb(var(--c-primary-rgb) / 0.14)",
        }}
      />

      <SectionHeading
        eyebrow={ls(data, "eyebrow", locale)}
        title={ls(data, "title", locale)}
        subtitle={ls(data, "subtitle", locale)}
      />

      {body && (
        <Reveal className="mx-auto mt-7 max-w-2xl text-center">
          <div className="prose-brand" dangerouslySetInnerHTML={{ __html: sanitizeRichText(body) }} />
        </Reveal>
      )}

      {clips.length > 0 && (
        <Reveal direction="scale" duration={0.85}>
          <SummerCampPlayer clips={clips} labels={labelsFor(locale)} />
        </Reveal>
      )}

      {highlights.length > 0 && (
        <RevealGroup className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" as="ul">
          {highlights.map((item, index) => (
            <RevealItem key={index} as="li" className="h-full">
              <TiltCard className="group h-full">
                <div className="card card-hover h-full p-6">
                  <span
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)]",
                      "bg-[rgb(var(--c-accent-rgb)/0.14)] text-[var(--c-accent)]",
                    )}
                  >
                    <Icon name={item.icon || "sparkles"} size={20} />
                  </span>
                  {t(item.title, locale) && (
                    <h3 className="mt-5 font-display text-lg font-bold text-[var(--c-text)]">
                      {t(item.title, locale)}
                    </h3>
                  )}
                  {t(item.text, locale) && (
                    <p className="mt-2.5 text-sm leading-relaxed text-[var(--c-muted)]">
                      {t(item.text, locale)}
                    </p>
                  )}
                </div>
              </TiltCard>
            </RevealItem>
          ))}
        </RevealGroup>
      )}

      {(button || secondary) && (
        <Reveal className="mt-12 flex flex-wrap justify-center gap-3">
          {button && (
            <MagneticButton href={safeHref(button.href)} variant="primary">
              {t(button.label, locale)}
              <Icon name="arrowRight" size={17} className="rtl-flip" />
            </MagneticButton>
          )}
          {secondary && (
            <MagneticButton href={safeHref(secondary.href)} variant="secondary">
              {t(secondary.label, locale)}
            </MagneticButton>
          )}
        </Reveal>
      )}
    </SectionShell>
  );
}
