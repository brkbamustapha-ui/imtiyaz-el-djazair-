import type { Locale } from "@/lib/i18n";
import type { RenderableSection } from "@/server/content";
import { HeroSection } from "./HeroSection";
import { PartnersSection } from "./PartnersSection";
import { AboutSection } from "./AboutSection";
import { ValueCardsSection } from "./ValueCardsSection";
import { ServicesSection } from "./ServicesSection";
import { IeltsSection } from "./IeltsSection";
import { ExamCenterSection } from "./ExamCenterSection";
import { StatsSection } from "./StatsSection";
import { GallerySection } from "./GallerySection";
import { TestimonialsSection } from "./TestimonialsSection";
import { NewsSection } from "./NewsSection";
import { FaqSection } from "./FaqSection";
import { CtaSection } from "./CtaSection";
import { ContactSection } from "./ContactSection";
import { RichTextSection } from "./RichTextSection";
import { FeatureGridSection } from "./FeatureGridSection";
import { StepsSection } from "./StepsSection";
import { VideoGallerySection } from "./VideoGallerySection";
import type { SectionProps } from "./helpers";

/**
 * Maps a section type stored in the database to the component that renders it.
 * Adding a block = one entry in src/lib/section-types.ts + one entry here.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const REGISTRY: Record<string, (props: SectionProps) => any> = {
  hero: HeroSection,
  partners: PartnersSection,
  about: AboutSection,
  valueCards: ValueCardsSection,
  services: ServicesSection,
  ielts: IeltsSection,
  examCenter: ExamCenterSection,
  stats: StatsSection,
  gallery: GallerySection,
  testimonials: TestimonialsSection,
  news: NewsSection,
  faq: FaqSection,
  cta: CtaSection,
  contact: ContactSection,
  richText: RichTextSection,
  featureGrid: FeatureGridSection,
  steps: StepsSection,
  videoGallery: VideoGallerySection,
};

export function SectionRenderer({
  sections,
  locale,
}: {
  sections: RenderableSection[];
  locale: Locale;
}) {
  return (
    <>
      {sections.map((section) => {
        const Component = REGISTRY[section.type];
        if (!Component) {
          if (process.env.NODE_ENV !== "production") {
            return (
              <div key={section.id} className="container-x py-8">
                <p className="card p-4 text-sm text-[var(--c-muted)]">
                  Unknown section type <code>{section.type}</code> — add it to
                  SectionRenderer.
                </p>
              </div>
            );
          }
          return null;
        }
        return (
          <Component
            key={section.id}
            data={section.data}
            locale={locale}
            sectionId={`section-${section.type}-${section.id.slice(-6)}`}
          />
        );
      })}
    </>
  );
}

export const SECTION_COMPONENT_KEYS = Object.keys(REGISTRY);
