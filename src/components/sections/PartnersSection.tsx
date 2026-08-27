import { lt } from "@/lib/localized-field";
import Image from "next/image";
import { getActivePartners } from "@/server/content";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { TiltCard } from "@/components/ui/TiltCard";
import { Icon } from "@/components/ui/Icon";
import { safeHref } from "@/lib/utils";
import { ls, str, SectionHeading, SectionShell, type SectionProps } from "./helpers";

const TYPE_LABEL: Record<string, string> = {
  PARTNER: "Partner",
  SPONSOR: "Sponsor",
  CERTIFICATION: "Certification",
  ASSOCIATION: "Association",
};

export async function PartnersSection({ data, locale, sectionId }: SectionProps) {
  const partners = await getActivePartners(str(data, "filterType", "ALL"));
  if (partners.length === 0) return null;

  const layout = str(data, "layout", "cards");
  const disclaimer = ls(data, "disclaimer", locale);

  if (layout === "strip") {
    const doubled = [...partners, ...partners];
    return (
      <SectionShell id={sectionId} className="!py-16" tone="surface">
        <SectionHeading
          eyebrow={ls(data, "eyebrow", locale)}
          title={ls(data, "title", locale)}
          subtitle={ls(data, "subtitle", locale)}
        />
        <div className="marquee-mask mt-10 overflow-hidden">
          <div className="marquee-track gap-14">
            {doubled.map((partner, index) => (
              <Image
                key={`${partner.id}-${index}`}
                src={partner.logoUrl}
                alt={partner.name}
                width={170}
                height={60}
                className="h-11 w-auto max-w-[170px] shrink-0 object-contain opacity-55 grayscale transition hover:opacity-100 hover:grayscale-0"
              />
            ))}
          </div>
        </div>
        {disclaimer && (
          <p className="mt-8 text-center text-xs text-[var(--c-muted)]">{disclaimer}</p>
        )}
      </SectionShell>
    );
  }

  return (
    <SectionShell id={sectionId} tone="surface">
      <SectionHeading
        eyebrow={ls(data, "eyebrow", locale)}
        title={ls(data, "title", locale)}
        subtitle={ls(data, "subtitle", locale)}
      />

      <RevealGroup className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {partners.map((partner) => (
          <RevealItem key={partner.id} className="group h-full">
            <TiltCard className="h-full">
              <article className="card card-hover flex h-full flex-col p-7">
                {/* Neutral plate: keeps both light and dark partner artwork legible. */}
                <div className="flex h-20 items-center justify-center rounded-[var(--radius-sm)] bg-[rgb(var(--c-text-rgb)/0.04)] px-5">
                  <Image
                    src={partner.logoUrl}
                    alt={partner.name}
                    width={220}
                    height={72}
                    className="max-h-14 w-auto max-w-[200px] object-contain"
                  />
                </div>
                <div className="mt-5 flex items-center gap-2">
                  <span className="rounded-full border border-[var(--c-border)] px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[var(--c-accent)]">
                    {TYPE_LABEL[partner.type] ?? partner.type}
                  </span>
                </div>
                <h3 className="h3 mt-3">{partner.name}</h3>
                {lt(partner.description, locale) && (
                  <p className="mt-2.5 flex-1 text-sm leading-relaxed text-[var(--c-muted)]">
                    {lt(partner.description, locale)}
                  </p>
                )}
                {partner.website && (
                  <a
                    href={safeHref(partner.website)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--c-primary)] transition-colors hover:text-[var(--c-accent)]"
                  >
                    {locale === "fr" ? "Visiter le site" : locale === "ar" ? "زيارة الموقع" : "Visit website"}
                    <Icon name="arrowUpRight" size={15} />
                  </a>
                )}
              </article>
            </TiltCard>
          </RevealItem>
        ))}
      </RevealGroup>

      {disclaimer && (
        <Reveal>
          <p className="mx-auto mt-10 max-w-2xl text-center text-xs leading-relaxed text-[var(--c-muted)]">
            {disclaimer}
          </p>
        </Reveal>
      )}
    </SectionShell>
  );
}
