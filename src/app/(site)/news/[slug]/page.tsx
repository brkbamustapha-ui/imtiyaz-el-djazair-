import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug, getPosts } from "@/server/content";
import { getLocale } from "@/lib/locale";
import { getAllSettings } from "@/lib/settings";
import { JsonLd } from "@/components/public/JsonLd";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { formatDate, readingTime, sanitizeRichText, truncate } from "@/lib/utils";
import { metadataFromPageSeo, parsePageSeo, siteUrl } from "@/lib/seo";

const DATE_LOCALE: Record<string, string> = { en: "en-GB", fr: "fr-FR", ar: "ar-DZ" };
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Not found" };

  return metadataFromPageSeo(parsePageSeo(post.seoJson), {
    title: post.title,
    description: post.excerpt || truncate(post.content.replace(/<[^>]+>/g, " "), 155),
    path: `/news/${post.slug}`,
  });
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const [post, locale, settings] = await Promise.all([
    getPostBySlug(slug),
    getLocale(),
    getAllSettings(),
  ]);
  if (!post) notFound();

  const related = (await getPosts({ type: "ALL", limit: 4 })).filter((item) => item.id !== post.id).slice(0, 3);
  const publishedAt = post.publishedAt ?? post.createdAt;

  return (
    <article className="pt-[calc(var(--header-h)+32px)]">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": post.type === "EVENT" ? "Event" : "NewsArticle",
          headline: post.title,
          description: post.excerpt,
          image: post.coverUrl ? siteUrl(post.coverUrl) : siteUrl(settings.general.ogImageUrl),
          datePublished: publishedAt.toISOString(),
          dateModified: post.updatedAt.toISOString(),
          ...(post.type === "EVENT"
            ? {
                startDate: (post.eventDate ?? publishedAt).toISOString(),
                location: post.location
                  ? { "@type": "Place", name: post.location }
                  : undefined,
                eventStatus: "https://schema.org/EventScheduled",
              }
            : {
                author: { "@type": "Organization", name: settings.general.siteName },
                publisher: {
                  "@type": "Organization",
                  name: settings.general.siteName,
                  logo: { "@type": "ImageObject", url: siteUrl(settings.general.logoUrl) },
                },
              }),
          mainEntityOfPage: siteUrl(`/news/${post.slug}`),
        }}
      />

      <div className="container-x">
        <Reveal>
          <Link
            href="/news"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--c-muted)] transition-colors hover:text-[var(--c-accent)]"
          >
            <Icon name="chevronLeft" size={15} className="rtl-flip" />
            {locale === "fr" ? "Toutes les actualités" : locale === "ar" ? "كل الأخبار" : "All news"}
          </Link>
        </Reveal>

        <header className="mx-auto mt-8 max-w-3xl">
          <Reveal delay={0.05}>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--c-muted)]">
              <span className="rounded-full bg-[rgb(var(--c-accent-rgb)/0.14)] px-3 py-1 font-semibold uppercase tracking-[0.14em] text-[var(--c-accent)]">
                {post.type === "EVENT" ? "Event" : post.category}
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="clock" size={13} />
                {formatDate(post.eventDate ?? publishedAt, DATE_LOCALE[locale])}
              </span>
              {post.location && (
                <span className="flex items-center gap-1.5">
                  <Icon name="pin" size={13} />
                  {post.location}
                </span>
              )}
              <span>
                {readingTime(post.content)} {locale === "fr" ? "min de lecture" : locale === "ar" ? "دقيقة قراءة" : "min read"}
              </span>
            </p>
            <h1 className="h1 mt-5 text-balance">{post.title}</h1>
            {post.excerpt && <p className="lead mt-5">{post.excerpt}</p>}
          </Reveal>
        </header>

        {post.coverUrl && (
          <Reveal delay={0.1} className="mx-auto mt-10 max-w-4xl">
            <div className="relative aspect-[16/9] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--c-border)]">
              <Image src={post.coverUrl} alt="" fill sizes="(max-width: 1024px) 100vw, 900px" className="object-cover" priority />
            </div>
          </Reveal>
        )}

        <Reveal delay={0.12} className="mx-auto mt-12 max-w-3xl">
          <div
            className="prose-brand"
            dangerouslySetInnerHTML={{ __html: sanitizeRichText(post.content) }}
          />
        </Reveal>
      </div>

      {related.length > 0 && (
        <section className="section-y">
          <div className="container-x">
            <h2 className="h3">
              {locale === "fr" ? "À lire aussi" : locale === "ar" ? "اقرأ أيضًا" : "Read next"}
            </h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-3">
              {related.map((item) => (
                <li key={item.id}>
                  <Link href={`/news/${item.slug}`} className="card card-hover group block h-full p-5">
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[var(--c-accent)]">
                      {item.type === "EVENT" ? "Event" : item.category}
                    </p>
                    <h3 className="mt-2.5 text-[0.98rem] font-semibold leading-snug transition-colors group-hover:text-[var(--c-accent)]">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-xs text-[var(--c-muted)]">
                      {formatDate(item.publishedAt ?? item.createdAt, DATE_LOCALE[locale])}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
      <div className="h-16" />
    </article>
  );
}
