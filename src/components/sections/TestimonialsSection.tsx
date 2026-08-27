import { lt } from "@/lib/localized-field";
import Image from "next/image";
import { getTestimonials } from "@/server/content";
import { RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/Icon";
import { ls, num, SectionHeading, SectionShell, type SectionProps } from "./helpers";

export async function TestimonialsSection({ data, locale, sectionId }: SectionProps) {
  const testimonials = await getTestimonials(num(data, "limit", 9));
  if (testimonials.length === 0) return null;

  return (
    <SectionShell id={sectionId}>
      <SectionHeading
        eyebrow={ls(data, "eyebrow", locale)}
        title={ls(data, "title", locale)}
        subtitle={ls(data, "subtitle", locale)}
      />

      <RevealGroup className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((item) => (
          <RevealItem key={item.id} className="h-full">
            <figure className="card card-hover relative flex h-full flex-col p-7">
              <span
                aria-hidden
                className="absolute end-6 top-6 text-[var(--c-accent)] opacity-15"
              >
                <Icon name="quote" size={38} />
              </span>

              <div className="flex gap-0.5" aria-label={`${item.rating} out of 5`}>
                {Array.from({ length: 5 }).map((_, index) => (
                  <Icon
                    key={index}
                    name="star"
                    size={14}
                    className={
                      index < item.rating
                        ? "fill-[var(--c-accent)] text-[var(--c-accent)]"
                        : "text-[var(--c-border)]"
                    }
                  />
                ))}
              </div>

              <blockquote className="mt-5 flex-1 text-[0.94rem] leading-relaxed text-[var(--c-text)]">
                “{lt(item.quote, locale)}”
              </blockquote>

              <figcaption className="mt-6 flex items-center gap-3 border-t border-[var(--c-border)] pt-5">
                {item.photoUrl ? (
                  <Image
                    src={item.photoUrl}
                    alt=""
                    width={44}
                    height={44}
                    className="h-11 w-11 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgb(var(--c-primary-rgb)/0.16)] font-display text-sm font-bold text-[var(--c-primary)]">
                    {item.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span>
                  <span className="block text-sm font-semibold text-[var(--c-text)]">{item.name}</span>
                  {lt(item.program, locale) && (
                    <span className="block text-xs text-[var(--c-muted)]">
                      {lt(item.program, locale)}
                    </span>
                  )}
                </span>
              </figcaption>
            </figure>
          </RevealItem>
        ))}
      </RevealGroup>
    </SectionShell>
  );
}
