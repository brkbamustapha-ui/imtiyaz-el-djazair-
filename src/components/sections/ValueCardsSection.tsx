import { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { TiltCard } from "@/components/ui/TiltCard";
import { Icon } from "@/components/ui/Icon";
import { t, type LocalizedText } from "@/lib/i18n";
import { arr, ls, SectionHeading, SectionShell, type SectionProps } from "./helpers";

type Card = { title: LocalizedText | string; body: LocalizedText | string; icon?: string };

export function ValueCardsSection({ data, locale, sectionId }: SectionProps) {
  const cards = arr<Card>(data, "cards");
  if (cards.length === 0) return null;

  return (
    <SectionShell id={sectionId}>
      <SectionHeading
        eyebrow={ls(data, "eyebrow", locale)}
        title={ls(data, "title", locale)}
        subtitle={ls(data, "subtitle", locale)}
      />

      <RevealGroup className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, index) => (
          <RevealItem key={index} className="group h-full">
            <TiltCard className="h-full">
              <article className="card card-hover relative h-full overflow-hidden p-8">
                <span
                  aria-hidden
                  className="pointer-events-none absolute -end-6 -top-6 font-display text-[7rem] font-black leading-none text-[rgb(var(--c-text-rgb)/0.035)]"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="relative flex h-13 w-13 items-center justify-center rounded-[var(--radius-sm)] border border-[rgb(var(--c-accent-rgb)/0.3)] bg-[rgb(var(--c-accent-rgb)/0.09)] p-3.5 text-[var(--c-accent)]">
                  <Icon name={card.icon || "star"} size={22} />
                </span>
                <h3 className="h3 relative mt-6">{t(card.title, locale)}</h3>
                <p className="relative mt-3 text-[0.94rem] leading-relaxed text-[var(--c-muted)]">
                  {t(card.body, locale)}
                </p>
              </article>
            </TiltCard>
          </RevealItem>
        ))}
      </RevealGroup>
    </SectionShell>
  );
}
