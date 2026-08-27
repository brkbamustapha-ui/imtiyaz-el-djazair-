import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { getLocale } from "@/lib/locale";
import { getAllSettings } from "@/lib/settings";
import { RevealGroup, RevealItem, Reveal } from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/Icon";
import { formatDate } from "@/lib/utils";
import { siteUrl } from "@/lib/seo";
import { ImagePlaceholder } from "@/components/sections/AboutSection";

const DATE_LOCALE: Record<string, string> = { en: "en-GB", fr: "fr-FR", ar: "ar-DZ" };
const PAGE_SIZE = 9;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getAllSettings();
  return {
    title: "News & Events",
    description: `Latest news, announcements and events from ${settings.general.siteName}.`,
    alternates: { canonical: siteUrl("/news") },
  };
}

type Props = { searchParams: Promise<{ page?: string; type?: string }> };

export default async function NewsIndexPage({ searchParams }: Props) {
  const params = await searchParams;
  const locale = await getLocale();
  const currentPage = Math.max(1, Number(params.page ?? 1) || 1);
  const typeFilter = params.type === "EVENT" || params.type === "NEWS" ? params.type : undefined;

  const where = { isPublished: true, ...(typeFilter ? { type: typeFilter } : {}) };
  const [posts, total] = await Promise.all([
    db.post.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.post.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const heading =
    locale === "fr" ? "Actualités et événements" : locale === "ar" ? "الأخبار والفعاليات" : "News & Events";

  const filters = [
    { value: undefined, label: locale === "fr" ? "Tout" : locale === "ar" ? "الكل" : "All" },
    { value: "NEWS", label: locale === "fr" ? "Actualités" : locale === "ar" ? "أخبار" : "News" },
    { value: "EVENT", label: locale === "fr" ? "Événements" : locale === "ar" ? "فعاليات" : "Events" },
  ];

  return (
    <div className="pt-[calc(var(--header-h)+40px)]">
      <div className="container-x">
        <Reveal>
          <p className="eyebrow">{locale === "fr" ? "Newsroom" : locale === "ar" ? "غرفة الأخبار" : "Newsroom"}</p>
          <h1 className="h1 mt-3">{heading}</h1>
        </Reveal>

        <Reveal delay={0.08}>
          <ul className="mt-8 flex flex-wrap gap-2">
            {filters.map((filter) => {
              const active = filter.value === typeFilter;
              return (
                <li key={filter.label}>
                  <Link
                    href={filter.value ? `/news?type=${filter.value}` : "/news"}
                    className={`btn btn-sm ${active ? "btn-primary" : "btn-secondary"}`}
                  >
                    {filter.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </Reveal>

        {posts.length === 0 ? (
          <p className="card mt-10 p-10 text-center text-sm text-[var(--c-muted)]">
            {locale === "fr"
              ? "Aucune publication pour le moment."
              : locale === "ar"
                ? "لا توجد منشورات بعد."
                : "Nothing published yet."}
          </p>
        ) : (
          <RevealGroup className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
                      {post.type === "EVENT" ? "Event" : post.category}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <p className="flex items-center gap-1.5 text-xs text-[var(--c-muted)]">
                      <Icon name="clock" size={13} />
                      {formatDate(post.eventDate ?? post.publishedAt ?? post.createdAt, DATE_LOCALE[locale])}
                    </p>
                    <h2 className="mt-3 text-[1.05rem] font-semibold leading-snug transition-colors group-hover:text-[var(--c-accent)]">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="mt-2.5 flex-1 text-sm leading-relaxed text-[var(--c-muted)]">
                        {post.excerpt}
                      </p>
                    )}
                  </div>
                </Link>
              </RevealItem>
            ))}
          </RevealGroup>
        )}

        {totalPages > 1 && (
          <nav className="mt-12 flex items-center justify-center gap-2" aria-label="Pagination">
            {Array.from({ length: totalPages }).map((_, index) => {
              const page = index + 1;
              const query = new URLSearchParams();
              if (typeFilter) query.set("type", typeFilter);
              if (page > 1) query.set("page", String(page));
              const href = query.toString() ? `/news?${query}` : "/news";
              return (
                <Link
                  key={page}
                  href={href}
                  aria-current={page === currentPage ? "page" : undefined}
                  className={`flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-semibold transition-colors ${
                    page === currentPage
                      ? "bg-[var(--c-accent)] text-[var(--c-on-accent)]"
                      : "border border-[var(--c-border)] text-[var(--c-muted)] hover:text-[var(--c-text)]"
                  }`}
                >
                  {page}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
      <div className="h-24" />
    </div>
  );
}
