import { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { t, type LocalizedText } from "@/lib/i18n";
import { arr, ls, SectionHeading, SectionShell, type SectionProps } from "./helpers";

type Step = { title: LocalizedText | string; description: LocalizedText | string };

export function StepsSection({ data, locale, sectionId }: SectionProps) {
  const steps = arr<Step>(data, "steps");
  if (steps.length === 0) return null;

  return (
    <SectionShell id={sectionId} tone="surface">
      <SectionHeading
        eyebrow={ls(data, "eyebrow", locale)}
        title={ls(data, "title", locale)}
        subtitle={ls(data, "subtitle", locale)}
      />

      <RevealGroup as="ol" className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <RevealItem key={index} as="li" className="relative">
            {index < steps.length - 1 && (
              <span
                aria-hidden
                className="absolute start-[22px] top-12 hidden h-[calc(100%-12px)] w-px bg-gradient-to-b from-[var(--c-accent)] to-transparent sm:block lg:inset-x-auto lg:start-14 lg:top-[22px] lg:h-px lg:w-[calc(100%-40px)] lg:bg-gradient-to-r"
              />
            )}
            <span className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[rgb(var(--c-accent-rgb)/0.4)] bg-[var(--c-bg)] font-display text-sm font-bold text-[var(--c-accent)]">
              {index + 1}
            </span>
            <h3 className="mt-5 text-[1.02rem] font-semibold text-[var(--c-text)]">
              {t(step.title, locale)}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--c-muted)]">
              {t(step.description, locale)}
            </p>
          </RevealItem>
        ))}
      </RevealGroup>
    </SectionShell>
  );
}
