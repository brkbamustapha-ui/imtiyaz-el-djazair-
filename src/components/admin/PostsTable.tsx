"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deletePostAction, togglePostPublishedAction } from "@/app/admin/actions/posts";
import { Icon } from "@/components/ui/Icon";
import { ConfirmButton, EmptyState, Notice, Toggle } from "./ui";
import { formatDate } from "@/lib/utils";

type PostRow = {
  id: string;
  slug: string;
  title: string;
  type: string;
  category: string;
  isPublished: boolean;
  publishedAt: string | null;
  eventDate: string | null;
  coverUrl: string;
};

export function PostsTable({ posts, canPublish }: { posts: PostRow[]; canPublish: boolean }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"ALL" | "NEWS" | "EVENT" | "DRAFT">("ALL");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<{ ok: boolean; message: string }>) => {
    startTransition(async () => {
      const result = await action();
      setMessage({ ok: result.ok, text: result.message });
      router.refresh();
    });
  };

  const visible = posts.filter((post) => {
    if (filter === "ALL") return true;
    if (filter === "DRAFT") return !post.isPublished;
    return post.type === filter;
  });

  return (
    <>
      {message && (
        <div className="mb-4">
          <Notice tone={message.ok ? "success" : "danger"}>{message.text}</Notice>
        </div>
      )}

      <div className="a-card">
        <div className="flex flex-wrap gap-1 border-b border-[var(--a-line)] p-3">
          {([
            ["ALL", "All"],
            ["NEWS", "News"],
            ["EVENT", "Events"],
            ["DRAFT", "Drafts"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`a-btn a-btn-sm ${filter === value ? "a-btn-primary" : "a-btn-ghost"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon="news"
            title="Nothing here yet"
            description="Write an announcement, a course update or an upcoming event."
            action={
              <Link href="/admin/posts/new" className="a-btn a-btn-primary a-btn-sm">
                <Icon name="plus" size={14} />
                New article
              </Link>
            }
          />
        ) : (
          <div className="a-scroll-x">
            <table className="a-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Published</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((post) => (
                  <tr key={post.id}>
                    <td>
                      <span className="flex items-center gap-3">
                        <span className="flex h-9 w-12 shrink-0 items-center justify-center overflow-hidden rounded border border-[var(--a-line)] bg-[var(--a-panel-2)]">
                          {post.coverUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={post.coverUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Icon name="image" size={13} className="text-[var(--a-faint)]" />
                          )}
                        </span>
                        <span className="min-w-0">
                          <Link href={`/admin/posts/${post.id}`} className="block truncate font-medium hover:text-[var(--a-brand)]">
                            {post.title}
                          </Link>
                          <code className="a-mono block truncate text-[0.7rem] text-[var(--a-faint)]">
                            /news/{post.slug}
                          </code>
                        </span>
                      </span>
                    </td>
                    <td>
                      <span className={`a-badge ${post.type === "EVENT" ? "a-badge-brand" : "a-badge-neutral"}`}>
                        {post.type === "EVENT" ? "Event" : post.category}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-[var(--a-muted)]">
                      {formatDate(post.eventDate ?? post.publishedAt) || "—"}
                    </td>
                    <td>
                      <Toggle
                        checked={post.isPublished}
                        disabled={!canPublish || pending}
                        label={`Publish ${post.title}`}
                        onChange={(value) => run(() => togglePostPublishedAction(post.id, value))}
                      />
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        {post.isPublished && (
                          <a
                            href={`/news/${post.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="a-btn a-btn-ghost a-btn-icon"
                            aria-label="View on the website"
                            title="View on the website"
                          >
                            <Icon name="arrowUpRight" size={14} />
                          </a>
                        )}
                        <Link
                          href={`/admin/posts/${post.id}`}
                          className="a-btn a-btn-ghost a-btn-icon"
                          aria-label={`Edit ${post.title}`}
                        >
                          <Icon name="edit" size={14} />
                        </Link>
                        {canPublish && (
                          <ConfirmButton
                            label="Delete"
                            icon="trash"
                            iconOnly
                            confirmTitle={`Delete “${post.title}”?`}
                            confirmBody="The article is removed from the website and cannot be recovered."
                            onConfirm={() => run(() => deletePostAction(post.id))}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
