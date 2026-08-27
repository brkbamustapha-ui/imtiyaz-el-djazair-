import { Reveal, RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { Icon } from "@/components/ui/Icon";
import { VideoCard } from "@/components/public/VideoCard";
import { cn, safeHref, sanitizeRichText } from "@/lib/utils";
import { t, type LocalizedText } from "@/lib/i18n";
import { arr, cta, ls, str, SectionHeading, SectionShell, type SectionProps } from "./helpers";

type Clip = { title?: LocalizedText | string; src?: string; poster?: string };

const PLAY_LABEL: Record<string, string> = {
  en: "Play the video",
  fr: "Lire la vidéo",
  ar: "تشغيل الفيديو",
};

export function VideoGallerySection({ data, locale, sectionId }: SectionProps) {
  const clips = arr<Clip>(data, "videos").filter((clip) => Boolean(clip.src));
  if (clips.length === 0) return null;

  const columns = str(data, "columns", "3");
  const button = cta(data, "primaryCta");
  const body = ls(data, "body", locale);

  return (
    <SectionShell id={sectionId} tone={str(data, "tone", "surface") === "surface" ? "surface" : "default"}>
      <SectionHeading
        eyebrow={ls(data, "eyebrow", locale)}
        title={ls(data, "title", locale)}
        subtitle={ls(data, "subtitle", locale)}
      />

      {body && (
        <Reveal className="mx-auto mt-6 max-w-2xl text-center">
          <div className="prose-brand" dangerouslySetInnerHTML={{ __html: sanitizeRichText(body) }} />
        </Reveal>
      )}

      <RevealGroup
        className={cn(
          "mt-14 grid gap-5 sm:grid-cols-2",
          columns === "2" ? "lg:grid-cols-2" : columns === "4" ? "lg:grid-cols-4" : "lg:grid-cols-3",
        )}
      >
        {clips.map((clip, index) => (
          <RevealItem key={`${clip.src}-${index}`} className="h-full">
            <VideoCard
              src={clip.src ?? ""}
              poster={clip.poster ?? ""}
              title={t(clip.title, locale)}
              playLabel={PLAY_LABEL[locale] ?? PLAY_LABEL.en}
            />
          </RevealItem>
        ))}
      </RevealGroup>

      {button && (
        <Reveal className="mt-12 flex justify-center">
          <MagneticButton href={safeHref(button.href)} variant="primary">
            {t(button.label, locale)}
            <Icon name="arrowRight" size={17} className="rtl-flip" />
          </MagneticButton>
        </Reveal>
      )}
    </SectionShell>
  );
}
