import Image from "next/image";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { Icon } from "@/components/ui/Icon";
import { safeHref, sanitizeRichText } from "@/lib/utils";
import { t, type LocalizedText } from "@/lib/i18n";
import { arr, cta, ls, str, SectionShell, type SectionProps } from "./helpers";
import { ImagePlaceholder } from "./AboutSection";

type Feature = { title: LocalizedText | string; description: LocalizedText | string; icon?: string };

export function ExamCenterSection({ data, locale, sectionId }: SectionProps) {
  const features = arr<Feature>(data, "features");
  const image = str(data, "image");
  const button = cta(data, "primaryCta");

  return (
    <SectionShell id={sectionId}>
      <div className="grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16">
        <Reveal direction="right">
          <div className="relative">
            <div className="card relative aspect-[4/3] overflow-hidden">
              {image ? (
                <Image
                  src={image}
                  alt={ls(data, "title", locale)}
                  fill
                  sizes="(max-width: 1024px) 100vw, 46vw"
                  className="object-cover"
                />
              ) : (
                <ImagePlaceholder
                  label={
                    locale === "fr"
                      ? "Ajoutez une photo du centre d'examen"
                      : locale === "ar"
                        ? "أضف صورة لمركز الامتحانات"
                        : "Add a photo of the exam centre"
                  }
                />
              )}
            </div>
            <div
              aria-hidden
              className="absolute -bottom-5 -end-5 hidden h-24 w-24 rounded-[var(--radius)] border border-[rgb(var(--c-accent-rgb)/0.35)] bg-[var(--c-surface-2)]/80 backdrop-blur sm:block"
            />
          </div>
        </Reveal>

        <Reveal direction="left" delay={0.08}>
          <div>
            {ls(data, "eyebrow", locale) && <p className="eyebrow">{ls(data, "eyebrow", locale)}</p>}
            <h2 className="h2 mt-3 text-balance">{ls(data, "title", locale)}</h2>
            <div
              className="prose-brand mt-5"
              dangerouslySetInnerHTML={{ __html: sanitizeRichText(ls(data, "body", locale)) }}
            />

            <RevealGroup className="mt-8 grid gap-4 sm:grid-cols-2">
              {features.map((feature, index) => (
                <RevealItem key={index}>
                  <div className="rounded-[var(--radius-sm)] border border-[var(--c-border)] bg-[rgb(var(--c-text-rgb)/0.02)] p-4">
                    <span className="text-[var(--c-accent)]">
                      <Icon name={feature.icon || "shield"} size={18} />
                    </span>
                    <h3 className="mt-3 text-sm font-semibold text-[var(--c-text)]">
                      {t(feature.title, locale)}
                    </h3>
                    <p className="mt-1.5 text-[0.82rem] leading-relaxed text-[var(--c-muted)]">
                      {t(feature.description, locale)}
                    </p>
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>

            {button && (
              <div className="mt-9">
                <MagneticButton href={safeHref(button.href)} variant="secondary">
                  {t(button.label, locale)}
                  <Icon name="arrowRight" size={16} className="rtl-flip" />
                </MagneticButton>
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </SectionShell>
  );
}
