import Image from "next/image";
import { Reveal } from "@/components/ui/Reveal";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { Icon } from "@/components/ui/Icon";
import { cn, safeHref, sanitizeRichText } from "@/lib/utils";
import { t, type LocalizedText } from "@/lib/i18n";
import { arr, cta, ls, str, SectionShell, type SectionProps } from "./helpers";
import { PhotoStack, type StackShot } from "@/components/public/PhotoStack";

type Bullet = { text: LocalizedText | string; icon?: string };

export function AboutSection({ data, locale, sectionId }: SectionProps) {
  const image = str(data, "image");
  // The frame takes either one photograph or several that cycle through it.
  const shots = arr<StackShot>(data, "images").filter((shot) => shot?.url?.trim());
  const imageRight = str(data, "imagePosition", "right") === "right";
  const bullets = arr<Bullet>(data, "bullets");
  const button = cta(data, "primaryCta");

  return (
    <SectionShell id={sectionId}>
      <div
        className={cn(
          "grid items-center gap-12 lg:grid-cols-2 lg:gap-16",
          !imageRight && "lg:[&>*:first-child]:order-2",
        )}
      >
        <Reveal direction={imageRight ? "right" : "left"}>
          <div>
            {ls(data, "eyebrow", locale) && <p className="eyebrow">{ls(data, "eyebrow", locale)}</p>}
            <h2 className="h2 mt-3 text-balance">{ls(data, "title", locale)}</h2>
            <div
              className="prose-brand mt-6"
              dangerouslySetInnerHTML={{ __html: sanitizeRichText(ls(data, "body", locale)) }}
            />

            {bullets.length > 0 && (
              <ul className="mt-8 space-y-3.5">
                {bullets.map((bullet, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--c-accent-rgb)/0.14)] text-[var(--c-accent)]">
                      <Icon name={bullet.icon || "check"} size={15} />
                    </span>
                    <span className="text-[0.94rem] leading-relaxed text-[var(--c-text)]">
                      {t(bullet.text, locale)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

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

        <Reveal direction={imageRight ? "left" : "right"} delay={0.1}>
          <div className="relative">
            <div
              aria-hidden
              className="glow-orb"
              style={{
                width: "70%",
                height: "70%",
                insetInlineEnd: "-12%",
                top: "-10%",
                background: "rgb(var(--c-primary-rgb) / 0.28)",
              }}
            />
            <div className="card relative aspect-[4/5] overflow-hidden sm:aspect-[5/4] lg:aspect-[4/5]">
              {shots.length > 0 ? (
                <PhotoStack
                  shots={shots}
                  alt={ls(data, "title", locale)}
                  sizes="(max-width: 1024px) 100vw, 46vw"
                />
              ) : image ? (
                <Image
                  src={image}
                  alt={ls(data, "title", locale)}
                  fill
                  sizes="(max-width: 1024px) 100vw, 46vw"
                  className="object-cover"
                />
              ) : (
                <ImagePlaceholder label={locale === "fr" ? "Ajoutez une photo depuis l'administration" : locale === "ar" ? "أضف صورة من لوحة التحكم" : "Add a photo from the admin"} />
              )}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--c-bg)]/70 via-transparent to-transparent"
              />
            </div>
          </div>
        </Reveal>
      </div>
    </SectionShell>
  );
}

export function ImagePlaceholder({ label }: { label: string }) {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-3 text-center"
      style={{
        backgroundImage:
          "radial-gradient(80% 60% at 50% 30%, rgb(var(--c-primary-rgb)/0.16), transparent 70%), var(--c-surface-2)",
      }}
    >
      <Icon name="image" size={30} className="text-[var(--c-muted)] opacity-60" />
      <p className="max-w-[70%] text-xs text-[var(--c-muted)]">{label}</p>
    </div>
  );
}
