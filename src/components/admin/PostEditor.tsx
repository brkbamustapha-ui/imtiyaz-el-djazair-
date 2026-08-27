"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { savePostAction } from "@/app/admin/actions/posts";
import { Icon } from "@/components/ui/Icon";
import { Card, Field, Notice, Spinner } from "./ui";
import { MediaField } from "./MediaPicker";
import { slugify } from "@/lib/utils";

export type PostFormValues = {
  id: string | null;
  title: string;
  slug: string;
  type: "NEWS" | "EVENT";
  excerpt: string;
  content: string;
  category: string;
  location: string;
  coverUrl: string;
  eventDate: string;
  isPublished: boolean;
  seoTitle: string;
  seoDescription: string;
  noindex: boolean;
};

export function PostEditor({
  initial,
  canPublish,
}: {
  initial: PostFormValues;
  canPublish: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.slug));
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof PostFormValues>(key: K, value: PostFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const save = (publish: boolean) => {
    startTransition(async () => {
      const result = await savePostAction(values.id, { ...values, isPublished: publish });
      setMessage({ ok: result.ok, text: result.message });
      if (result.ok && result.id && !values.id) {
        router.replace(`/admin/posts/${result.id}`);
      }
      if (result.ok) {
        set("isPublished", publish);
        router.refresh();
      }
    });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <Card>
          <div className="space-y-4 p-5">
            <Field label="Title" htmlFor="post-title">
              <input
                id="post-title"
                className="a-input text-base"
                value={values.title}
                onChange={(event) => {
                  set("title", event.target.value);
                  if (!slugTouched) set("slug", slugify(event.target.value));
                }}
                placeholder="New IELTS preparation intake opens this month"
              />
            </Field>

            <Field label="URL" htmlFor="post-slug" help="Changing this breaks existing links to the article.">
              <div className="flex items-center gap-1.5">
                <span className="a-mono text-sm text-[var(--a-faint)]">/news/</span>
                <input
                  id="post-slug"
                  className="a-input a-mono"
                  value={values.slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    set("slug", slugify(event.target.value));
                  }}
                />
              </div>
            </Field>

            <Field
              label="Summary"
              htmlFor="post-excerpt"
              help="Shown on cards and used as the meta description when no SEO description is set."
            >
              <textarea
                id="post-excerpt"
                className="a-textarea"
                rows={2}
                maxLength={400}
                value={values.excerpt}
                onChange={(event) => set("excerpt", event.target.value)}
              />
            </Field>

            <Field
              label="Article"
              htmlFor="post-content"
              help="Basic HTML is allowed: <p>, <h2>, <h3>, <ul>, <ol>, <li>, <strong>, <em>, <a>, <blockquote>. Scripts and inline event handlers are stripped when saved."
            >
              <textarea
                id="post-content"
                className="a-textarea font-[ui-monospace] text-[0.82rem]"
                rows={20}
                value={values.content}
                onChange={(event) => set("content", event.target.value)}
                placeholder="<p>Write the article here.</p>"
              />
            </Field>
          </div>
        </Card>

        <Card title="Search engine preview" description="How this article is likely to appear in results.">
          <div className="p-5">
            <div className="rounded-[var(--a-radius-sm)] border border-[var(--a-line)] bg-[var(--a-panel-2)] p-4">
              <p className="truncate text-[0.72rem] text-[var(--a-muted)]">
                yoursite.com › news › {values.slug || "article"}
              </p>
              <p className="mt-1 truncate text-[1.05rem] text-[#6ea8fe]">
                {values.seoTitle || values.title || "Article title"}
              </p>
              <p className="mt-1 line-clamp-2 text-[0.82rem] text-[var(--a-muted)]">
                {values.seoDescription || values.excerpt || "Add a summary so search engines show something useful here."}
              </p>
            </div>

            <div className="mt-4 space-y-4">
              <Field label="Meta title" htmlFor="post-seo-title" help={`${values.seoTitle.length}/60 recommended`}>
                <input
                  id="post-seo-title"
                  className="a-input"
                  value={values.seoTitle}
                  onChange={(event) => set("seoTitle", event.target.value)}
                />
              </Field>
              <Field
                label="Meta description"
                htmlFor="post-seo-description"
                help={`${values.seoDescription.length}/155 recommended`}
              >
                <textarea
                  id="post-seo-description"
                  className="a-textarea"
                  rows={2}
                  value={values.seoDescription}
                  onChange={(event) => set("seoDescription", event.target.value)}
                />
              </Field>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-5">
        <Card title="Publish">
          <div className="space-y-3 p-5">
            {message && <Notice tone={message.ok ? "success" : "danger"}>{message.text}</Notice>}

            <p className="text-sm text-[var(--a-muted)]">
              Status:{" "}
              <span className={values.isPublished ? "text-[var(--a-success)]" : "text-[var(--a-warn)]"}>
                {values.isPublished ? "Published" : "Draft"}
              </span>
            </p>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="a-btn a-btn-outline"
                disabled={pending || values.title.trim().length < 2}
                onClick={() => save(false)}
              >
                {pending && <Spinner />}
                Save draft
              </button>
              {canPublish && (
                <button
                  type="button"
                  className="a-btn a-btn-primary"
                  disabled={pending || values.title.trim().length < 2}
                  onClick={() => save(true)}
                >
                  {pending && <Spinner />}
                  {values.isPublished ? "Update published article" : "Publish"}
                </button>
              )}
              {!canPublish && (
                <p className="a-help">Editors save drafts; an Admin publishes them.</p>
              )}
            </div>

            {values.id && values.isPublished && (
              <Link
                href={`/news/${values.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="a-btn a-btn-ghost a-btn-sm w-full"
              >
                <Icon name="arrowUpRight" size={14} />
                View on the website
              </Link>
            )}
          </div>
        </Card>

        <Card title="Details">
          <div className="space-y-4 p-5">
            <Field label="Type" htmlFor="post-type">
              <select
                id="post-type"
                className="a-select"
                value={values.type}
                onChange={(event) => set("type", event.target.value as "NEWS" | "EVENT")}
              >
                <option value="NEWS">News article</option>
                <option value="EVENT">Event</option>
              </select>
            </Field>

            <Field label="Category" htmlFor="post-category" help="Shown as a small label on the card.">
              <input
                id="post-category"
                className="a-input"
                value={values.category}
                onChange={(event) => set("category", event.target.value)}
                placeholder="IELTS"
              />
            </Field>

            {values.type === "EVENT" && (
              <>
                <Field label="Event date" htmlFor="post-date">
                  <input
                    id="post-date"
                    type="date"
                    className="a-input"
                    value={values.eventDate}
                    onChange={(event) => set("eventDate", event.target.value)}
                  />
                </Field>
                <Field label="Location" htmlFor="post-location">
                  <input
                    id="post-location"
                    className="a-input"
                    value={values.location}
                    onChange={(event) => set("location", event.target.value)}
                  />
                </Field>
              </>
            )}

            <Field label="Cover image">
              <MediaField value={values.coverUrl} onChange={(url) => set("coverUrl", url)} label="Cover image" />
            </Field>
          </div>
        </Card>

        <Card title="Language">
          <p className="p-5 text-sm leading-relaxed text-[var(--a-muted)]">
            Articles are written in one language. To publish the same announcement in another
            language, create a second article with its own URL — that keeps each version
            indexable on its own.
          </p>
        </Card>
      </div>
    </div>
  );
}
