import { lt } from "@/lib/localized-field";
import Link from "next/link";
import { getServices } from "@/server/content";
import { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { TiltCard } from "@/components/ui/TiltCard";
import { Icon } from "@/components/ui/Icon";
import { cn, safeHref } from "@/lib/utils";
import { bool, ls, num, str, SectionHeading, SectionShell, type SectionProps } from "./helpers";

export async function ServicesSection({ data, locale, sectionId }: SectionProps) {
  const services = await getServices(num(data, "limit", 9));
  if (services.length === 0) return null;

  const columns = str(data, "columns", "3");
  const showCta = bool(data, "showCta", true);
  const learnMore =
    locale === "fr" ? "En savoir plus" : locale === "ar" ? "اعرف المزيد" : "Learn more";

  return (
    <SectionShell id={sectionId}>
      <SectionHeading
        eyebrow={ls(data, "eyebrow", locale)}
        title={ls(data, "title", locale)}
        subtitle={ls(data, "subtitle", locale)}
      />

      <RevealGroup
        className={cn(
          "mt-14 grid gap-5 sm:grid-cols-2",
          columns === "2" ? "lg:grid-cols-2" : "lg:grid-cols-3",
        )}
      >
        {services.map((service) => (
          <RevealItem key={service.id} className="group h-full">
            <TiltCard className="h-full">
              <article className="card card-hover relative h-full overflow-hidden p-7">
                <div
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--c-accent)] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-70"
                />
                <span className="relative flex h-14 w-14 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-br from-[rgb(var(--c-primary-rgb)/0.22)] to-[rgb(var(--c-accent-rgb)/0.14)] text-[var(--c-primary)] transition-transform duration-500 group-hover:scale-105">
                  <Icon name={service.icon} size={24} />
                </span>
                <h3 className="h3 mt-6">{lt(service.title, locale)}</h3>
                <p className="mt-3 text-[0.94rem] leading-relaxed text-[var(--c-muted)]">
                  {lt(service.description, locale)}
                </p>
                {showCta && service.href && (
                  <Link
                    href={safeHref(service.href)}
                    className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--c-accent)] transition-transform duration-300 group-hover:translate-x-1"
                  >
                    {learnMore}
                    <Icon name="arrowRight" size={15} className="rtl-flip" />
                  </Link>
                )}
              </article>
            </TiltCard>
          </RevealItem>
        ))}
      </RevealGroup>
    </SectionShell>
  );
}
