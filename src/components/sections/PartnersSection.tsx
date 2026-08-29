import { lt } from "@/lib/localized-field";
import Image from "next/image";
import { getActivePartners } from "@/server/content";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { TiltCard } from "@/components/ui/TiltCard";
import { Icon } from "@/components/ui/Icon";
import { safeHref } from "@/lib/utils";
import { parseJson } from "@/lib/json";
import { PartnerGallery, type PartnerShot } from "@/components/public/PartnerGallery";
import { ls, str, SectionHeading, SectionShell, type SectionProps } from "./helpers";

/**
 * The badge under each logo. It states the nature of the relationship and
 * nothing more: none of these organisations owns, runs or accredits the school,
 * and the wording must never let a visitor read it that way.
 */
const TYPE_LABEL: Record<string, string> = {
  PARTNER: "Partner",
  SPONSOR: "Sponsor",
  IELTS_PARTNERSHIP: "British Council IELTS Partnership",
  CERTIFICATION: "Certification",
  ASSOCIATION: "Association",
};

const GALLERY_LABELS = {
  en: { open: "see the photos", close: "Close", prev: "Previous photo", next: "Next photo", counter: "{index} of {total}" },
  fr: { open: "voir les photos", close: "Fermer", prev: "Photo précédente", next: "Photo suivante", counter: "{index} sur {total}" },
  ar: { open: "شاهد الصور", close: "إغلاق", prev: "الصورة السابقة", next: "الصورة التالية", counter: "{index} من {total}" },
} as const;

const VIEW_PHOTOS = {
  en: "View photos",
  fr: "Voir les photos",
  ar: "عرض الصور",
} as const;

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
              <span
                key={`${partner.id}-${index}`}
                className="flex h-20 shrink-0 items-center rounded-[var(--radius-sm)] bg-white px-5 py-3"
              >
                <Image
                  src={partner.logoUrl}
                  alt={partner.name}
                  width={200}
                  height={200}
                  className="max-h-full w-auto max-w-[180px] object-contain"
                />
              </span>
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
        {partners.map((partner) => {
          const shots = parseJson<PartnerShot[]>(partner.galleryJson, []).filter((s) => s?.url);
          const card = (
            <TiltCard className="h-full">
              <article className="card card-hover flex h-full flex-col p-7">
                {/* Light plate: partner artwork is mostly dark-on-transparent,
                    which would disappear against the site's dark surfaces. */}
                {/* The plate is a fixed box and the logo fills it as far as its
                    own aspect ratio allows. Capping height alone made a square
                    crest (Manchester City, TOLES) render a quarter the optical
                    size of a wide wordmark next to it — the sponsor's mark
                    looked like an afterthought. object-contain still means
                    nothing is ever stretched or cropped. */}
                <div className="flex h-28 items-center justify-center rounded-[var(--radius-sm)] bg-white p-4">
                  <Image
                    src={partner.logoUrl}
                    alt={partner.name}
                    width={240}
                    height={240}
                    className="max-h-full w-auto max-w-full object-contain"
                  />
                </div>
                {partner.showType && (
                  <div className="mt-5 flex items-center gap-2">
                    <span className="rounded-full border border-[var(--c-border)] px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[var(--c-accent)]">
                      {TYPE_LABEL[partner.type] ?? partner.type}
                    </span>
                  </div>
                )}
                <h3 className={partner.showType ? "h3 mt-3" : "h3 mt-5"}>{partner.name}</h3>
                {lt(partner.description, locale) && (
                  <p className="mt-2.5 flex-1 text-sm leading-relaxed text-[var(--c-muted)]">
                    {lt(partner.description, locale)}
                  </p>
                )}
                {shots.length > 0 && (
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--c-accent)]">
                    <Icon name="expand" size={15} />
                    {VIEW_PHOTOS[locale as keyof typeof VIEW_PHOTOS] ?? VIEW_PHOTOS.en}
                  </span>
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
          );

          return (
            <RevealItem key={partner.id} className="group h-full">
              {shots.length > 0 ? (
                <PartnerGallery
                  name={partner.name}
                  shots={shots}
                  labels={GALLERY_LABELS[locale as keyof typeof GALLERY_LABELS] ?? GALLERY_LABELS.en}
                >
                  {card}
                </PartnerGallery>
              ) : (
                card
              )}
            </RevealItem>
          );
        })}
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
