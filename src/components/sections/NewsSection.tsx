import Image from "next/image";
import Link from "next/link";
import { getPosts } from "@/server/content";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { Icon } from "@/components/ui/Icon";
import { formatDate, safeHref } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { cta, ls, num, str, SectionHeading, SectionShell, type SectionProps } from "./helpers";
import { ImagePlaceholder } from "./AboutSection";

const DATE_LOCALE: Record<string, string> = { en: "en-GB", fr: "fr-FR", ar: "ar-DZ" };

export async function NewsSection({ data, locale, sectionId }: SectionProps) {
  const source = str(data, "source", "ALL") as "ALL" | "NEWS" | "EVENT";
  const posts = await getPosts({ type: source, limit: num(data, "limit", 3) });
  if (posts.length === 0) return null;
  const button = cta(data, "primaryCta");

  return (
    <SectionShell id={sectionId}>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading
          eyebrow={ls(data, "eyebrow", locale)}
          title={ls(data, "title", locale)}
          subtitle={ls(data, "subtitle", locale)}
          align="left"
          className="!mx-0"
        />
        {button && (
          <MagneticButton href={safeHref(button.href)} variant="secondary" className="btn-sm">
            {t(button.label, locale)}
            <Icon name="arrowRight" size={15} className="rtl-flip" />
          </MagneticButton>
        )}
      </div>

      <RevealGroup className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <RevealItem key={post.id} as="article" className="h-full">
            <Link
              href={`/news/${post.slug}`}
              className="card card-hover group flex h-full flex-col overflow-hidden"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                {post.coverUrl ? (
                  <Image
                    src={post.coverUrl}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <ImagePlaceholder label="" />
                )}
                <span className="absolute start-3 top-3 rounded-full bg-[var(--c-bg)]/80 px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[var(--c-accent)] backdrop-blur">
                  {post.type === "EVENT"
                    ? locale === "fr"
                      ? "Événement"
                      : locale === "ar"
                        ? "فعالية"
                        : "Event"
                    : post.category}
                </span>
              </div>

              <div className="flex flex-1 flex-col p-6">
                <p className="flex items-center gap-1.5 text-xs text-[var(--c-muted)]">
                  <Icon name="clock" size={13} />
                  {formatDate(post.eventDate ?? post.publishedAt ?? post.createdAt, DATE_LOCALE[locale])}
                  {post.location && <span className="truncate">· {post.location}</span>}
                </p>
                <h3 className="mt-3 text-[1.05rem] font-semibold leading-snug text-[var(--c-text)] transition-colors group-hover:text-[var(--c-accent)]">
                  {post.title}
                </h3>
                {post.excerpt && (
                  <p className="mt-2.5 flex-1 text-sm leading-relaxed text-[var(--c-muted)]">
                    {post.excerpt}
                  </p>
                )}
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--c-primary)]">
                  {locale === "fr" ? "Lire la suite" : locale === "ar" ? "اقرأ المزيد" : "Read more"}
                  <Icon
                    name="arrowRight"
                    size={15}
                    className="rtl-flip transition-transform duration-300 group-hover:translate-x-1"
                  />
                </span>
              </div>
            </Link>
          </RevealItem>
        ))}
      </RevealGroup>

      {button && (
        <Reveal className="mt-10 flex justify-center md:hidden">
          <MagneticButton href={safeHref(button.href)} variant="secondary">
            {t(button.label, locale)}
          </MagneticButton>
        </Reveal>
      )}
    </SectionShell>
  );
}
