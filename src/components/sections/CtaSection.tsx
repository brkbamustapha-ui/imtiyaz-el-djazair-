import { Reveal } from "@/components/ui/Reveal";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { Icon } from "@/components/ui/Icon";
import { cn, safeHref } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { cta, ls, str, type SectionProps } from "./helpers";

export function CtaSection({ data, locale, sectionId }: SectionProps) {
  const primary = cta(data, "primaryCta");
  const secondary = cta(data, "secondaryCta");
  const variant = str(data, "variant", "gradient");

  return (
    <section id={sectionId} className="section-y relative">
      <div className="container-x">
        <Reveal direction="scale">
          <div
            className={cn(
              "relative overflow-hidden rounded-[var(--radius-lg)] px-6 py-14 text-center sm:px-12 sm:py-20",
              variant === "gradient"
                ? "border border-[rgb(var(--c-accent-rgb)/0.22)]"
                : "border border-[var(--c-border)] bg-[var(--c-surface)]",
            )}
            style={
              variant === "gradient"
                ? {
                    backgroundImage:
                      "radial-gradient(110% 130% at 12% 0%, rgb(var(--c-primary-rgb)/0.28), transparent 55%), radial-gradient(100% 120% at 92% 100%, rgb(var(--c-accent-rgb)/0.22), transparent 58%), var(--c-surface)",
                  }
                : undefined
            }
          >
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.14]"
              style={{
                backgroundImage:
                  "linear-gradient(rgb(var(--c-text-rgb)/0.1) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--c-text-rgb)/0.1) 1px, transparent 1px)",
                backgroundSize: "48px 48px",
                maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, #000, transparent 75%)",
                WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, #000, transparent 75%)",
              }}
            />

            <div className="relative mx-auto max-w-2xl">
              <h2 className="h1 text-balance">{ls(data, "title", locale)}</h2>
              {ls(data, "description", locale) && (
                <p className="lead mt-5 text-pretty">{ls(data, "description", locale)}</p>
              )}
              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                {primary && (
                  <MagneticButton href={safeHref(primary.href)} variant="primary">
                    {t(primary.label, locale)}
                    <Icon name="arrowRight" size={17} className="rtl-flip" />
                  </MagneticButton>
                )}
                {secondary && (
                  <MagneticButton href={safeHref(secondary.href)} variant="secondary">
                    {t(secondary.label, locale)}
                  </MagneticButton>
                )}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
