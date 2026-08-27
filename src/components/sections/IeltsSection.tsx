import { RevealGroup, RevealItem, Reveal } from "@/components/ui/Reveal";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { Icon } from "@/components/ui/Icon";
import { JourneyPath } from "@/components/3d/JourneyPath";
import { safeHref } from "@/lib/utils";
import { t, type LocalizedText } from "@/lib/i18n";
import { arr, bool, cta, ls, SectionHeading, SectionShell, type SectionProps } from "./helpers";

type Module = { title: LocalizedText | string; description: LocalizedText | string; icon?: string };

export function IeltsSection({ data, locale, sectionId }: SectionProps) {
  const modules = arr<Module>(data, "modules");
  const button = cta(data, "primaryCta");

  return (
    <SectionShell id={sectionId} tone="surface" className="overflow-hidden">
      <div
        aria-hidden
        className="glow-orb"
        style={{
          width: 520,
          height: 520,
          insetInlineEnd: "-14%",
          top: "-20%",
          background: "rgb(var(--c-primary-rgb) / 0.2)",
        }}
      />

      <SectionHeading
        eyebrow={ls(data, "eyebrow", locale)}
        title={ls(data, "title", locale)}
        subtitle={ls(data, "subtitle", locale)}
      />

      {bool(data, "showJourney", true) && modules.length > 1 && (
        <Reveal className="mt-12" delay={0.1}>
          <JourneyPath steps={modules.map((module) => t(module.title, locale))} />
        </Reveal>
      )}

      <RevealGroup className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((module, index) => (
          <RevealItem key={index} className="h-full">
            <article className="card card-hover group h-full p-6">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--c-border)] bg-[rgb(var(--c-primary-rgb)/0.1)] text-[var(--c-primary)]">
                  <Icon name={module.icon || "book"} size={19} />
                </span>
                <div>
                  <h3 className="text-[1.02rem] font-semibold text-[var(--c-text)]">
                    {t(module.title, locale)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--c-muted)]">
                    {t(module.description, locale)}
                  </p>
                </div>
              </div>
            </article>
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
