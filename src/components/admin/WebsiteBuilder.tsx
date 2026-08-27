"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  addSectionAction,
  deleteSectionAction,
  duplicateSectionAction,
  publishPageAction,
  renameSectionAction,
  reorderSectionsAction,
  toggleSectionAction,
} from "@/app/admin/actions/content";
import { SECTION_TYPES } from "@/lib/section-types";
import type { Locale } from "@/lib/i18n";
import { Icon } from "@/components/ui/Icon";
import { ConfirmButton, Modal, Notice, Spinner, Toggle } from "./ui";
import { SectionEditorModal, type BuilderSection } from "./SectionEditorModal";
import { cn } from "@/lib/utils";

type BuilderPage = { id: string; slug: string; title: string; isPublished: boolean };
type Device = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTH: Record<Device, string> = {
  desktop: "100%",
  tablet: "834px",
  mobile: "390px",
};

export function WebsiteBuilder({
  pages,
  activePage,
  sections: initialSections,
  locales,
  canPublish,
  canManagePages,
}: {
  pages: BuilderPage[];
  activePage: BuilderPage;
  sections: BuilderSection[];
  locales: Locale[];
  canPublish: boolean;
  canManagePages: boolean;
}) {
  const router = useRouter();
  const [sections, setSections] = useState(initialSections);
  const [editing, setEditing] = useState<BuilderSection | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [device, setDevice] = useState<Device>("desktop");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeKey, setIframeKey] = useState(0);

  // Keep local state in sync when the server sends new props after a refresh.
  if (initialSections !== sections && initialSections.map((s) => s.id + s.order).join() !== sections.map((s) => s.id + s.order).join()) {
    setSections(initialSections);
  }

  const draftCount = sections.filter((section) => section.hasDraft).length;
  const previewSrc = `/api/preview/enter?path=${encodeURIComponent(activePage.slug === "home" ? "/" : `/${activePage.slug}`)}`;

  const reloadPreview = () => setIframeKey((key) => key + 1);

  const run = (action: () => Promise<{ ok: boolean; message: string }>) => {
    startTransition(async () => {
      const result = await action();
      setMessage({ ok: result.ok, text: result.message });
      router.refresh();
      reloadPreview();
    });
  };

  const commitOrder = (next: BuilderSection[]) => {
    setSections(next);
    startTransition(async () => {
      const result = await reorderSectionsAction(
        activePage.id,
        next.map((section) => section.id),
      );
      setMessage({ ok: result.ok, text: result.message });
      router.refresh();
      reloadPreview();
    });
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    commitOrder(next);
  };

  const handleDrop = (index: number) => {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    const next = [...sections];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    setDragIndex(null);
    setOverIndex(null);
    commitOrder(next);
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(340px,420px)_1fr]">
      {/* ------------------------------ Left: sections ------------------------------ */}
      <div className="space-y-4">
        <div className="a-card">
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--a-line)] p-3">
            <label className="sr-only" htmlFor="builder-page">
              Page
            </label>
            <select
              id="builder-page"
              className="a-select flex-1"
              value={activePage.id}
              onChange={(event) => router.push(`/admin/builder?page=${event.target.value}`)}
            >
              {pages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.title} — /{page.slug === "home" ? "" : page.slug}
                  {page.isPublished ? "" : " (unpublished)"}
                </option>
              ))}
            </select>
            {canManagePages && (
              <Link href="/admin/pages" className="a-btn a-btn-ghost a-btn-icon" title="Manage pages">
                <Icon name="settings" size={16} />
              </Link>
            )}
          </div>

          <ul className="p-2">
            {sections.map((section, index) => (
              <li
                key={section.id}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(event) => {
                  event.preventDefault();
                  setOverIndex(index);
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                onDrop={() => handleDrop(index)}
                className={cn(
                  "mb-1.5 rounded-[var(--a-radius-sm)] border border-[var(--a-line)] bg-[var(--a-panel-2)] transition-all",
                  dragIndex === index && "a-row-dragging",
                  overIndex === index && dragIndex !== null && dragIndex !== index && "a-row-over",
                  !section.isEnabled && "opacity-60",
                )}
              >
                <div className="flex items-center gap-1 p-2">
                  <span className="a-drag-handle px-1" aria-hidden>
                    <Icon name="drag" size={15} />
                  </span>

                  <button
                    type="button"
                    onClick={() => setEditing(section)}
                    className="min-w-0 flex-1 text-start"
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[0.86rem] font-medium">{section.name}</span>
                      {section.hasDraft && (
                        <span className="a-badge a-badge-warn shrink-0 !px-1.5 !text-[0.58rem]">Draft</span>
                      )}
                    </span>
                    <span className="block truncate text-[0.68rem] text-[var(--a-faint)]">
                      {section.type}
                    </span>
                  </button>

                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      className="a-btn a-btn-ghost a-btn-icon"
                      onClick={() => move(index, -1)}
                      disabled={index === 0 || pending}
                      aria-label={`Move ${section.name} up`}
                    >
                      <Icon name="chevronDown" size={14} className="rotate-180" />
                    </button>
                    <button
                      type="button"
                      className="a-btn a-btn-ghost a-btn-icon"
                      onClick={() => move(index, 1)}
                      disabled={index === sections.length - 1 || pending}
                      aria-label={`Move ${section.name} down`}
                    >
                      <Icon name="chevronDown" size={14} />
                    </button>
                    <Toggle
                      checked={section.isEnabled}
                      disabled={!canPublish || pending}
                      label={`Show ${section.name} on the website`}
                      onChange={(value) => run(() => toggleSectionAction(section.id, value))}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1 border-t border-[var(--a-line)] px-2 py-1.5">
                  <button
                    type="button"
                    className="a-btn a-btn-ghost a-btn-sm"
                    onClick={() => setEditing(section)}
                  >
                    <Icon name="edit" size={13} />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="a-btn a-btn-ghost a-btn-sm"
                    onClick={() => {
                      const name = window.prompt("Section name", section.name);
                      if (name !== null) run(() => renameSectionAction(section.id, name));
                    }}
                  >
                    <Icon name="pen" size={13} />
                    Rename
                  </button>
                  <button
                    type="button"
                    className="a-btn a-btn-ghost a-btn-sm"
                    onClick={() => run(() => duplicateSectionAction(section.id))}
                  >
                    <Icon name="copy" size={13} />
                    Duplicate
                  </button>
                  <span className="flex-1" />
                  {canPublish && (
                    <ConfirmButton
                      label="Delete"
                      icon="trash"
                      iconOnly
                      confirmTitle={`Delete “${section.name}”?`}
                      confirmBody="A snapshot is kept in the version history, but the section is removed from the page."
                      onConfirm={() => run(() => deleteSectionAction(section.id))}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="border-t border-[var(--a-line)] p-3">
            <button type="button" className="a-btn a-btn-outline w-full" onClick={() => setAddOpen(true)}>
              <Icon name="plus" size={15} />
              Add section
            </button>
          </div>
        </div>

        {message && <Notice tone={message.ok ? "success" : "danger"}>{message.text}</Notice>}
      </div>

      {/* ------------------------------ Right: preview ------------------------------ */}
      <div className="a-card flex min-h-[70vh] flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--a-line)] p-3">
          <div className="flex gap-0.5 rounded-full border border-[var(--a-line)] p-0.5">
            {(["desktop", "tablet", "mobile"] as Device[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setDevice(option)}
                className={cn(
                  "rounded-full px-3 py-1 text-[0.72rem] font-semibold capitalize transition-colors",
                  device === option
                    ? "bg-[var(--a-brand)] text-[#04121b]"
                    : "text-[var(--a-faint)] hover:text-[var(--a-text)]",
                )}
              >
                {option}
              </button>
            ))}
          </div>

          <button type="button" className="a-btn a-btn-ghost a-btn-sm" onClick={reloadPreview}>
            <Icon name="arrowRight" size={14} />
            Refresh
          </button>

          <span className="flex-1" />

          {draftCount > 0 && (
            <span className="a-badge a-badge-warn">
              {draftCount} unpublished change{draftCount === 1 ? "" : "s"}
            </span>
          )}

          <a
            href={previewSrc}
            target="_blank"
            rel="noopener noreferrer"
            className="a-btn a-btn-outline a-btn-sm"
          >
            <Icon name="arrowUpRight" size={14} />
            Open preview
          </a>

          {canPublish && (
            <button
              type="button"
              className="a-btn a-btn-primary a-btn-sm"
              disabled={pending || draftCount === 0}
              onClick={() => run(() => publishPageAction(activePage.id))}
            >
              {pending ? <Spinner /> : <Icon name="upload" size={14} />}
              Publish page
            </button>
          )}
        </div>

        <div className="flex flex-1 justify-center overflow-hidden bg-[var(--a-panel-2)] p-3">
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={previewSrc}
            title={`Preview of ${activePage.title}`}
            className="h-full w-full rounded-[var(--a-radius-sm)] border border-[var(--a-line)] bg-white transition-[width] duration-300"
            style={{ maxWidth: DEVICE_WIDTH[device] }}
          />
        </div>
      </div>

      <SectionEditorModal
        section={editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSaved={reloadPreview}
        locales={locales}
        canPublish={canPublish}
      />

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add a section" size="lg">
        <ul className="grid gap-2 sm:grid-cols-2">
          {SECTION_TYPES.map((definition) => (
            <li key={definition.type}>
              <button
                type="button"
                className="flex w-full items-start gap-3 rounded-[var(--a-radius-sm)] border border-[var(--a-line)] p-3 text-start transition-colors hover:border-[var(--a-brand)]"
                onClick={() => {
                  setAddOpen(false);
                  run(() => addSectionAction(activePage.id, definition.type));
                }}
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--a-radius-sm)] bg-[var(--a-brand-soft)] text-[var(--a-brand)]">
                  <Icon name={definition.icon} size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.86rem] font-semibold">{definition.label}</span>
                  <span className="block text-[0.74rem] leading-snug text-[var(--a-muted)]">
                    {definition.description}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  );
}
