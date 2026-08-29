import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { getAllSettings } from "@/lib/settings";
import { isLocale, type Locale } from "@/lib/i18n";
import { SEO_FIELDS } from "@/lib/settings-fields";
import { parsePageSeo, siteUrl } from "@/lib/seo";
import { Card, Notice, PageHeader } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "SEO" };

export default async function SeoPage() {
  const user = await requirePermission("seo.manage").catch(() => null);
  if (!user) notFound();

  const [settings, pages, publishedPosts] = await Promise.all([
    getAllSettings(),
    db.page.findMany({ orderBy: [{ isSystem: "desc" }, { order: "asc" }] }),
    db.post.count({ where: { isPublished: true } }),
  ]);

  const locales = settings.general.enabledLocales.filter(isLocale) as Locale[];
  const missing = pages.filter((page) => {
    const seo = parsePageSeo(page.seoJson);
    return !seo.title || !seo.description;
  });

  return (
    <>
      <PageHeader
        title="SEO"
        description="Site-wide search settings. Each page has its own title and description under Pages."
      />

      <div className="space-y-5">
        {!settings.seo.robotsIndex && (
          <Notice tone="warn">
            <strong>Search engines are currently blocked.</strong> robots.txt disallows everything
            and every page carries a noindex tag. Turn indexing on below when the site is ready.
          </Notice>
        )}

        {missing.length > 0 && (
          <Notice tone="info">
            {missing.length} page{missing.length === 1 ? "" : "s"} still {missing.length === 1 ? "has" : "have"} no
            custom meta title or description:{" "}
            {missing.map((page) => page.title).join(", ")}. They fall back to the defaults below.
          </Notice>
        )}

        <SettingsForm
          settingsKey="seo"
          title="Defaults"
          fields={SEO_FIELDS}
          initial={{
            ...(settings.seo as unknown as Record<string, unknown>),
            keywords: settings.seo.keywords.join(", "),
          }}
          locales={locales.length > 0 ? locales : ["en"]}
        />

        <Card title="Generated files" description="These are produced automatically from your content.">
          <ul className="divide-y divide-[var(--a-line)]">
            {[
              { href: "/sitemap.xml", label: "sitemap.xml", detail: `${pages.length} pages · ${publishedPosts} articles` },
              { href: "/robots.txt", label: "robots.txt", detail: settings.seo.robotsIndex ? "Indexing allowed" : "Indexing blocked" },
            ].map((entry) => (
              <li key={entry.href} className="flex items-center justify-between gap-3 p-4">
                <span>
                  <code className="a-mono block font-medium">{entry.label}</code>
                  <span className="text-[0.76rem] text-[var(--a-muted)]">{entry.detail}</span>
                </span>
                <a
                  href={entry.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="a-btn a-btn-ghost a-btn-sm"
                >
                  <Icon name="arrowUpRight" size={14} />
                  Open
                </a>
              </li>
            ))}
            <li className="p-4">
              <p className="text-[0.8rem] text-[var(--a-muted)]">
                Schema.org data (organisation, website, articles and events) is emitted on every
                relevant page. Canonical URLs, the sitemap and the share previews are all built on{" "}
                <code className="a-mono">{siteUrl("/")}</code> — the deployment&rsquo;s own domain
                unless <code className="a-mono">NEXT_PUBLIC_SITE_URL</code> names a real one. Set
                that variable once the school has its own domain.
              </p>
            </li>
          </ul>
        </Card>

        <Card title="Per-page SEO">
          <ul className="divide-y divide-[var(--a-line)]">
            {pages.map((page) => {
              const seo = parsePageSeo(page.seoJson);
              return (
                <li key={page.id} className="flex items-center justify-between gap-3 p-4">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{page.title}</span>
                    <span className="block truncate text-[0.76rem] text-[var(--a-muted)]">
                      {seo.title || <em>no meta title</em>} — {seo.description || <em>no description</em>}
                    </span>
                  </span>
                  <Link href="/admin/pages" className="a-btn a-btn-ghost a-btn-sm shrink-0">
                    Edit
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </>
  );
}
