import { lt } from "@/lib/localized-field";
import { getStats } from "@/server/content";
import { Counter } from "@/components/ui/Counter";
import { Icon } from "@/components/ui/Icon";
import { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { cn } from "@/lib/utils";
import { ls, str, SectionHeading, type SectionProps } from "./helpers";

export async function StatsSection({ data, locale, sectionId }: SectionProps) {
  const stats = await getStats();
  if (stats.length === 0) return null;
  const variant = str(data, "variant", "band");

  return (
    <section id={sectionId} className="relative section-y">
      <div className="container-x">
        <SectionHeading title={ls(data, "title", locale)} subtitle={ls(data, "subtitle", locale)} />

        <RevealGroup
          className={cn(
            "mt-12 grid gap-4",
            stats.length >= 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3",
            variant === "band" &&
              "overflow-hidden rounded-[var(--radius-lg)] border border-[var(--c-border)] !gap-0 bg-[var(--c-surface)] sm:divide-x sm:divide-[var(--c-border)] rtl:sm:divide-x-reverse",
          )}
        >
          {stats.map((stat) => (
            <RevealItem
              key={stat.id}
              className={cn(
                "text-center",
                variant === "band" ? "px-6 py-10" : "card card-hover p-8",
              )}
            >
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[rgb(var(--c-accent-rgb)/0.12)] text-[var(--c-accent)]">
                <Icon name={stat.icon} size={19} />
              </span>
              <p className="mt-5 font-display text-3xl font-extrabold text-[var(--c-text)] sm:text-4xl">
                <Counter value={stat.value} suffix={stat.suffix} />
              </p>
              <p className="mt-2 text-[0.76rem] font-medium uppercase tracking-[0.16em] text-[var(--c-muted)]">
                {lt(stat.label, locale)}
              </p>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
