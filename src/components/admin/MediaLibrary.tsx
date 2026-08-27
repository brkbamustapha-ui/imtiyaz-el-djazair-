"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteMediaAction, updateMediaAction } from "@/app/admin/actions/media";
import { Icon } from "@/components/ui/Icon";
import { ConfirmButton, EmptyState, Field, Modal, Notice, Spinner } from "./ui";
import { UploadButton, formatBytes } from "./MediaPicker";
import { formatDateTime, cn } from "@/lib/utils";

type Asset = {
  id: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  folder: string;
  alt: string;
  uploadedBy: string;
  createdAt: string;
};

export function MediaLibrary({
  assets,
  folders,
  activeFolder,
  query,
  totalCount,
  totalBytes,
  canDelete,
}: {
  assets: Asset[];
  folders: string[];
  activeFolder: string;
  query: string;
  totalCount: number;
  totalBytes: number;
  canDelete: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [selected, setSelected] = useState<Asset | null>(null);
  const [search, setSearch] = useState(query);
  const [uploadFolder, setUploadFolder] = useState(activeFolder || "general");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState<string | null>(null);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/admin/media${next.toString() ? `?${next}` : ""}`);
  };

  const run = (action: () => Promise<{ ok: boolean; message: string }>, onDone?: () => void) => {
    startTransition(async () => {
      const result = await action();
      setMessage({ ok: result.ok, text: result.message });
      if (result.ok) onDone?.();
      router.refresh();
    });
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setMessage({ ok: false, text: "Could not copy — select the path and copy it manually." });
    }
  };

  return (
    <>
      {message && (
        <div className="mb-4">
          <Notice tone={message.ok ? "success" : "danger"}>{message.text}</Notice>
        </div>
      )}

      <div className="a-card mb-4">
        <div className="flex flex-wrap items-center gap-2 p-3">
          <form
            className="relative min-w-[200px] flex-1"
            onSubmit={(event) => {
              event.preventDefault();
              setParam("q", search);
            }}
          >
            <input
              className="a-input ps-9"
              placeholder="Search by file name…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Icon
              name="search"
              size={15}
              className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--a-faint)]"
            />
          </form>

          <select
            className="a-select w-auto"
            value={activeFolder}
            onChange={(event) => setParam("folder", event.target.value)}
            aria-label="Filter by folder"
          >
            <option value="">All folders</option>
            {folders.map((folder) => (
              <option key={folder} value={folder}>
                {folder}
              </option>
            ))}
          </select>

          <input
            className="a-input w-[140px]"
            value={uploadFolder}
            onChange={(event) => setUploadFolder(event.target.value)}
            placeholder="Upload to folder"
            aria-label="Folder to upload into"
          />

          <UploadButton
            folder={uploadFolder}
            onUploaded={() => {
              setMessage({ ok: true, text: "Upload complete." });
              router.refresh();
            }}
          />
        </div>
        <p className="border-t border-[var(--a-line)] px-4 py-2 text-xs text-[var(--a-muted)]">
          {totalCount} file{totalCount === 1 ? "" : "s"} · {formatBytes(totalBytes)} total
        </p>
      </div>

      {assets.length === 0 ? (
        <div className="a-card">
          <EmptyState
            icon="image"
            title="No files here yet"
            description="Upload images for the gallery, article covers, partner logos and the hero background."
          />
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {assets.map((asset) => (
            <li key={asset.id} className="a-card overflow-hidden">
              <button
                type="button"
                onClick={() => setSelected(asset)}
                className="block w-full"
                aria-label={`Open ${asset.originalName}`}
              >
                <span className="flex aspect-square items-center justify-center bg-[var(--a-panel-2)]">
                  {asset.mimeType.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={asset.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <Icon name={asset.mimeType.startsWith("video/") ? "image" : "folder"} size={26} />
                  )}
                </span>
              </button>
              <div className="p-2.5">
                <p className="truncate text-[0.76rem] font-medium">{asset.originalName}</p>
                <p className="mt-0.5 text-[0.66rem] text-[var(--a-faint)]">
                  {formatBytes(asset.size)}
                  {asset.width ? ` · ${asset.width}×${asset.height}` : ""}
                </p>
                <div className="mt-2 flex gap-1">
                  <button
                    type="button"
                    className="a-btn a-btn-ghost a-btn-sm flex-1"
                    onClick={() => copyUrl(asset.url)}
                  >
                    <Icon name={copied === asset.url ? "check" : "copy"} size={12} />
                    {copied === asset.url ? "Copied" : "Copy path"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <Modal open onClose={() => setSelected(null)} title={selected.originalName} size="lg">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex items-center justify-center overflow-hidden rounded-[var(--a-radius-sm)] border border-[var(--a-line)] bg-[var(--a-panel-2)] p-2">
              {selected.mimeType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.url} alt={selected.alt} className="max-h-72 w-auto object-contain" />
              ) : selected.mimeType.startsWith("video/") ? (
                <video src={selected.url} controls className="max-h-72 w-full" />
              ) : (
                <a href={selected.url} target="_blank" rel="noopener noreferrer" className="a-btn a-btn-outline">
                  Open file
                </a>
              )}
            </div>

            <MediaDetails
              asset={selected}
              pending={pending}
              onSave={(input) => run(() => updateMediaAction(selected.id, input))}
            />
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-[var(--a-line)] pt-4 text-xs sm:grid-cols-4">
            {[
              ["Type", selected.mimeType],
              ["Size", formatBytes(selected.size)],
              ["Dimensions", selected.width ? `${selected.width}×${selected.height}` : "—"],
              ["Uploaded", formatDateTime(selected.createdAt)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[var(--a-faint)]">{label}</dt>
                <dd className="mt-0.5 truncate font-medium">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--a-line)] pt-4">
            <code className={cn("a-mono flex-1 truncate rounded bg-[var(--a-panel-2)] px-2 py-1.5")}>
              {selected.url}
            </code>
            <button type="button" className="a-btn a-btn-outline a-btn-sm" onClick={() => copyUrl(selected.url)}>
              <Icon name="copy" size={13} />
              Copy
            </button>
            {canDelete && (
              <ConfirmButton
                label="Delete file"
                icon="trash"
                confirmTitle={`Delete ${selected.originalName}?`}
                confirmBody="Anywhere this file is used will show a broken image. This cannot be undone."
                onConfirm={() =>
                  run(() => deleteMediaAction(selected.id), () => setSelected(null))
                }
              />
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

function MediaDetails({
  asset,
  pending,
  onSave,
}: {
  asset: Asset;
  pending: boolean;
  onSave: (input: { alt: string; folder: string; originalName: string }) => void;
}) {
  const [alt, setAlt] = useState(asset.alt);
  const [folder, setFolder] = useState(asset.folder);
  const [name, setName] = useState(asset.originalName);

  return (
    <div className="space-y-3">
      <Field label="File name" htmlFor="media-name">
        <input id="media-name" className="a-input" value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      <Field
        label="Alt text"
        htmlFor="media-alt"
        help="Describes the image for screen readers and search engines. Leave empty for purely decorative images."
      >
        <input id="media-alt" className="a-input" value={alt} onChange={(event) => setAlt(event.target.value)} />
      </Field>
      <Field label="Folder" htmlFor="media-folder">
        <input id="media-folder" className="a-input" value={folder} onChange={(event) => setFolder(event.target.value)} />
      </Field>
      <button
        type="button"
        className="a-btn a-btn-primary a-btn-sm"
        disabled={pending}
        onClick={() => onSave({ alt, folder, originalName: name })}
      >
        {pending && <Spinner />}
        Save details
      </button>
    </div>
  );
}
