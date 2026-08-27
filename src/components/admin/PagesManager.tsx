"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createPageAction,
  deletePageAction,
  duplicatePageAction,
  togglePagePublishedAction,
  updatePageAction,
  updatePageSeoAction,
} from "@/app/admin/actions/pages";
import type { PageSeo } from "@/lib/seo";
import { Icon } from "@/components/ui/Icon";
import { ConfirmButton, Field, Modal, Notice, Spinner, Toggle } from "./ui";
import { slugify } from "@/lib/utils";

type PageRow = {
  id: string;
  slug: string;
  title: string;
  isPublished: boolean;
  isSystem: boolean;
  showInNav: boolean;
  sectionCount: number;
  seo: PageSeo;
};

export function PagesManager({
  pages,
  canPublish,
  canEditSeo,
}: {
  pages: PageRow[];
  canPublish: boolean;
  canEditSeo: boolean;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PageRow | null>(null);
  const [seoFor, setSeoFor] = useState<PageRow | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<{ ok: boolean; message: string }>, onDone?: () => void) => {
    startTransition(async () => {
      const result = await action();
      setMessage({ ok: result.ok, text: result.message });
      if (result.ok) onDone?.();
      router.refresh();
    });
  };

  return (
    <>
      {message && (
        <div className="mb-4">
          <Notice tone={message.ok ? "success" : "danger"}>{message.text}</Notice>
        </div>
      )}

      <div className="a-card">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--a-line)] p-4">
          <p className="text-sm text-[var(--a-muted)]">{pages.length} pages</p>
          <button type="button" className="a-btn a-btn-primary a-btn-sm" onClick={() => setCreating(true)}>
            <Icon name="plus" size={14} />
            New page
          </button>
        </div>

        <div className="a-scroll-x">
          <table className="a-table">
            <thead>
              <tr>
                <th>Page</th>
                <th>URL</th>
                <th>Sections</th>
                <th>Published</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.id}>
                  <td>
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{page.title}</span>
                      {page.isSystem && <span className="a-badge a-badge-neutral">System</span>}
                    </span>
                  </td>
                  <td>
                    <code className="a-mono text-[var(--a-muted)]">
                      /{page.slug === "home" ? "" : page.slug}
                    </code>
                  </td>
                  <td className="text-[var(--a-muted)]">{page.sectionCount}</td>
                  <td>
                    <Toggle
                      checked={page.isPublished}
                      disabled={!canPublish || pending || (page.isSystem && page.isPublished)}
                      label={`Publish ${page.title}`}
                      onChange={(value) => run(() => togglePagePublishedAction(page.id, value))}
                    />
                  </td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <Link
                        href={`/admin/builder?page=${page.id}`}
                        className="a-btn a-btn-ghost a-btn-sm"
                        title="Edit sections"
                      >
                        <Icon name="layers" size={14} />
                        <span className="hidden sm:inline">Sections</span>
                      </Link>
                      <button
                        type="button"
                        className="a-btn a-btn-ghost a-btn-icon"
                        onClick={() => setEditing(page)}
                        aria-label={`Settings for ${page.title}`}
                      >
                        <Icon name="settings" size={14} />
                      </button>
                      {canEditSeo && (
                        <button
                          type="button"
                          className="a-btn a-btn-ghost a-btn-icon"
                          onClick={() => setSeoFor(page)}
                          aria-label={`SEO for ${page.title}`}
                          title="SEO"
                        >
                          <Icon name="search" size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        className="a-btn a-btn-ghost a-btn-icon"
                        onClick={() => run(() => duplicatePageAction(page.id))}
                        aria-label={`Duplicate ${page.title}`}
                        title="Duplicate"
                      >
                        <Icon name="copy" size={14} />
                      </button>
                      {!page.isSystem && (
                        <ConfirmButton
                          label="Delete"
                          icon="trash"
                          iconOnly
                          confirmTitle={`Delete “${page.title}”?`}
                          confirmBody="The page and all of its sections are removed. This cannot be undone."
                          onConfirm={() => run(() => deletePageAction(page.id))}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CreatePageModal
        open={creating}
        pages={pages}
        pending={pending}
        onClose={() => setCreating(false)}
        onCreate={(input) => run(() => createPageAction(input), () => setCreating(false))}
      />

      {editing && (
        <PageSettingsModal
          page={editing}
          pending={pending}
          onClose={() => setEditing(null)}
          onSave={(input) => run(() => updatePageAction(editing.id, input), () => setEditing(null))}
        />
      )}

      {seoFor && (
        <PageSeoModal
          page={seoFor}
          pending={pending}
          onClose={() => setSeoFor(null)}
          onSave={(seo) => run(() => updatePageSeoAction(seoFor.id, seo), () => setSeoFor(null))}
        />
      )}
    </>
  );
}

function CreatePageModal({
  open,
  pages,
  pending,
  onClose,
  onCreate,
}: {
  open: boolean;
  pages: PageRow[];
  pending: boolean;
  onClose: () => void;
  onCreate: (input: { title: string; slug: string; copyFromId?: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [copyFromId, setCopyFromId] = useState("");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New page"
      footer={
        <>
          <button type="button" className="a-btn a-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="a-btn a-btn-primary"
            disabled={pending || title.trim().length < 2}
            onClick={() => onCreate({ title, slug, copyFromId: copyFromId || undefined })}
          >
            {pending && <Spinner />}
            Create page
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Page title" htmlFor="new-page-title">
          <input
            id="new-page-title"
            className="a-input"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setSlug(slugify(event.target.value));
            }}
            autoFocus
          />
        </Field>
        <Field label="URL" htmlFor="new-page-slug" help="Letters, numbers and hyphens only.">
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-[var(--a-faint)]">/</span>
            <input
              id="new-page-slug"
              className="a-input a-mono"
              value={slug}
              onChange={(event) => setSlug(slugify(event.target.value))}
            />
          </div>
        </Field>
        <Field label="Start from" htmlFor="new-page-copy" help="Optionally copy the sections of an existing page.">
          <select
            id="new-page-copy"
            className="a-select"
            value={copyFromId}
            onChange={(event) => setCopyFromId(event.target.value)}
          >
            <option value="">Empty page</option>
            {pages.map((page) => (
              <option key={page.id} value={page.id}>
                Copy sections from “{page.title}”
              </option>
            ))}
          </select>
        </Field>
        <Notice tone="info">New pages start unpublished so you can build them before anyone sees them.</Notice>
      </div>
    </Modal>
  );
}

function PageSettingsModal({
  page,
  pending,
  onClose,
  onSave,
}: {
  page: PageRow;
  pending: boolean;
  onClose: () => void;
  onSave: (input: { title: string; slug: string; isPublished: boolean; showInNav: boolean }) => void;
}) {
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [isPublished, setIsPublished] = useState(page.isPublished);
  const [showInNav, setShowInNav] = useState(page.showInNav);

  return (
    <Modal
      open
      onClose={onClose}
      title={`Settings: ${page.title}`}
      footer={
        <>
          <button type="button" className="a-btn a-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="a-btn a-btn-primary"
            disabled={pending}
            onClick={() => onSave({ title, slug, isPublished, showInNav })}
          >
            {pending && <Spinner />}
            Save
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Title" htmlFor="page-title">
          <input id="page-title" className="a-input" value={title} onChange={(event) => setTitle(event.target.value)} />
        </Field>
        <Field
          label="URL"
          htmlFor="page-slug"
          help={page.isSystem ? "The home page URL is fixed." : "Changing this breaks existing links to the page."}
        >
          <input
            id="page-slug"
            className="a-input a-mono"
            value={slug}
            disabled={page.isSystem}
            onChange={(event) => setSlug(slugify(event.target.value))}
          />
        </Field>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--a-brand)]"
            checked={isPublished}
            disabled={page.isSystem}
            onChange={(event) => setIsPublished(event.target.checked)}
          />
          <span className="text-sm">Published</span>
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--a-brand)]"
            checked={showInNav}
            onChange={(event) => setShowInNav(event.target.checked)}
          />
          <span className="text-sm">
            Suggest in the menu editor
            <span className="a-help">The menu itself is edited in Design &amp; Structure → Menu.</span>
          </span>
        </label>
      </div>
    </Modal>
  );
}

function PageSeoModal({
  page,
  pending,
  onClose,
  onSave,
}: {
  page: PageRow;
  pending: boolean;
  onClose: () => void;
  onSave: (seo: Record<string, unknown>) => void;
}) {
  const [seo, setSeo] = useState({
    title: page.seo.title ?? "",
    description: page.seo.description ?? "",
    keywords: (page.seo.keywords ?? []).join(", "),
    ogImage: page.seo.ogImage ?? "",
    canonical: page.seo.canonical ?? "",
    noindex: Boolean(page.seo.noindex),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={`SEO: ${page.title}`}
      size="lg"
      footer={
        <>
          <button type="button" className="a-btn a-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="a-btn a-btn-primary" disabled={pending} onClick={() => onSave(seo)}>
            {pending && <Spinner />}
            Save SEO
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field
          label="Meta title"
          htmlFor="seo-title"
          help={`${seo.title.length}/60 characters recommended. Leave empty to use the page title.`}
        >
          <input id="seo-title" className="a-input" value={seo.title} onChange={(event) => setSeo({ ...seo, title: event.target.value })} />
        </Field>
        <Field
          label="Meta description"
          htmlFor="seo-description"
          help={`${seo.description.length}/155 characters recommended.`}
        >
          <textarea
            id="seo-description"
            className="a-textarea"
            rows={3}
            value={seo.description}
            onChange={(event) => setSeo({ ...seo, description: event.target.value })}
          />
        </Field>
        <Field label="Keywords" htmlFor="seo-keywords" help="Comma separated. Modern search engines mostly ignore these.">
          <input id="seo-keywords" className="a-input" value={seo.keywords} onChange={(event) => setSeo({ ...seo, keywords: event.target.value })} />
        </Field>
        <Field label="Share image (Open Graph)" htmlFor="seo-og" help="Path to an image, e.g. /uploads/general/share.png">
          <input id="seo-og" className="a-input a-mono" value={seo.ogImage} onChange={(event) => setSeo({ ...seo, ogImage: event.target.value })} />
        </Field>
        <Field label="Canonical URL" htmlFor="seo-canonical" help="Only set this if the same content also lives at another address.">
          <input id="seo-canonical" className="a-input a-mono" value={seo.canonical} onChange={(event) => setSeo({ ...seo, canonical: event.target.value })} />
        </Field>
        <label className="flex items-start gap-3 rounded-[var(--a-radius-sm)] border border-[var(--a-line)] p-3">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-[var(--a-brand)]"
            checked={seo.noindex}
            onChange={(event) => setSeo({ ...seo, noindex: event.target.checked })}
          />
          <span>
            <span className="block text-sm font-medium">Hide from search engines</span>
            <span className="a-help">Adds a noindex tag. Use for thank-you or internal pages.</span>
          </span>
        </label>
      </div>
    </Modal>
  );
}
