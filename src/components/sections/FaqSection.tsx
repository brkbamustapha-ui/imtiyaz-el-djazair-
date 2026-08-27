import { lt } from "@/lib/localized-field";
import { getFaq } from "@/server/content";
import { Reveal } from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/Icon";
import { ls, num, SectionHeading, SectionShell, type SectionProps } from "./helpers";

export async function FaqSection({ data, locale, sectionId }: SectionProps) {
  const items = await getFaq(num(data, "limit", 8));
  if (items.length === 0) return null;

  return (
    <SectionShell id={sectionId} tone="surface">
      <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <SectionHeading
          eyebrow={ls(data, "eyebrow", locale)}
          title={ls(data, "title", locale)}
          subtitle={ls(data, "subtitle", locale)}
          align="left"
          className="!mx-0 lg:sticky lg:top-28 lg:self-start"
        />

        <Reveal direction="left">
          {/* <details>/<summary> keeps this keyboard- and screen-reader-friendly
              with no JavaScript at all. */}
          <div className="divide-y divide-[var(--c-border)] border-y border-[var(--c-border)]">
            {items.map((item) => (
              <details key={item.id} className="group py-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-5 text-[0.98rem] font-semibold text-[var(--c-text)]">
                  {lt(item.question, locale)}
                  <span className="mt-0.5 shrink-0 text-[var(--c-accent)] transition-transform duration-300 group-open:rotate-180">
                    <Icon name="chevronDown" size={18} />
                  </span>
                </summary>
                <p className="mt-3.5 pe-8 text-[0.92rem] leading-relaxed text-[var(--c-muted)]">
                  {lt(item.answer, locale)}
                </p>
              </details>
            ))}
          </div>
        </Reveal>
      </div>
    </SectionShell>
  );
}
