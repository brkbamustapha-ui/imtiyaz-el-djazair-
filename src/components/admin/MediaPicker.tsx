"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Modal, Notice, Spinner } from "./ui";
import { cn } from "@/lib/utils";

export type MediaFile = {
  id: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  folder: string;
  alt: string;
};

export function useCsrfToken(): string {
  const [token, setToken] = useState("");
  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)ied_csrf=([^;]+)/);
    setToken(match ? decodeURIComponent(match[1]) : "");
  }, []);
  return token;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Small preview + "choose"/"clear" control used by every image/video field. */
export function MediaField({
  value,
  onChange,
  kind = "image",
  label,
}: {
  value: string;
  onChange: (url: string) => void;
  kind?: "image" | "video" | "any";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);

  // A stored path can outlive the file it pointed at; show that plainly rather
  // than rendering a broken image.
  useEffect(() => setBroken(false), [value]);

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[var(--a-radius-sm)] border border-[var(--a-line)] bg-[var(--a-panel-2)]">
          {value && !broken && kind !== "video" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt=""
              className="h-full w-full object-contain"
              onError={() => setBroken(true)}
            />
          ) : (
            <Icon name="image" size={18} className="text-[var(--a-faint)]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="a-btn a-btn-outline a-btn-sm" onClick={() => setOpen(true)}>
              <Icon name="folder" size={14} />
              {value ? "Change" : "Choose file"}
            </button>
            {value && (
              <button type="button" className="a-btn a-btn-ghost a-btn-sm" onClick={() => onChange("")}>
                Clear
              </button>
            )}
          </div>
          {value && (
            <p className="a-help a-mono mt-1.5 truncate">
              {value}
              {broken && (
                <span className="ms-1 font-sans text-[var(--a-warn)]">— file not found</span>
              )}
            </p>
          )}
        </div>
      </div>

      <MediaLibraryModal
        open={open}
        onClose={() => setOpen(false)}
        kind={kind}
        title={label ? `Choose: ${label}` : "Media library"}
        onSelect={(file) => {
          onChange(file.url);
          setOpen(false);
        }}
      />
    </>
  );
}

export function MediaLibraryModal({
  open,
  onClose,
  onSelect,
  kind = "any",
  title = "Media library",
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (file: MediaFile) => void;
  kind?: "image" | "video" | "any";
  title?: string;
}) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (kind !== "any") params.set("kind", kind);
      const response = await fetch(`/admin/api/media?${params}`);
      const payload = (await response.json()) as { ok: boolean; files: MediaFile[] };
      setFiles(payload.files ?? []);
    } catch {
      setError("Could not load the media library.");
    } finally {
      setLoading(false);
    }
  }, [query, kind]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <input
            className="a-input ps-9"
            placeholder="Search files…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Icon
            name="search"
            size={15}
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--a-faint)]"
          />
        </div>
        <UploadButton onUploaded={load} />
      </div>

      {error && <Notice tone="danger">{error}</Notice>}

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="a-skeleton aspect-square" />
          ))}
        </div>
      ) : files.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--a-muted)]">
          No files yet. Upload one to get started.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {files.map((file) => (
            <li key={file.id}>
              <button
                type="button"
                onClick={() => onSelect(file)}
                className="group w-full overflow-hidden rounded-[var(--a-radius-sm)] border border-[var(--a-line)] text-start transition-colors hover:border-[var(--a-brand)]"
              >
                <span className="flex aspect-square items-center justify-center bg-[var(--a-panel-2)]">
                  {file.mimeType.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={file.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <Icon name={file.mimeType.startsWith("video/") ? "image" : "folder"} size={22} />
                  )}
                </span>
                <span className="block truncate px-2 py-1.5 text-[0.7rem] text-[var(--a-muted)]">
                  {file.originalName}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

export function UploadButton({
  onUploaded,
  folder = "general",
  className,
  label = "Upload",
}: {
  onUploaded: (files: { id: string; url: string }[]) => void;
  folder?: string;
  className?: string;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const csrf = useCsrfToken();

  async function upload(fileList: FileList) {
    setBusy(true);
    setMessage("");
    const body = new FormData();
    body.set("_csrf", csrf);
    body.set("folder", folder);
    Array.from(fileList).forEach((file) => body.append("files", file));

    try {
      const response = await fetch("/admin/api/upload", { method: "POST", body });
      const payload = (await response.json()) as {
        ok: boolean;
        files?: { id: string; url: string }[];
        errors?: string[];
        error?: string;
      };
      if (payload.errors?.length) setMessage(payload.errors.join(" · "));
      else if (!payload.ok) setMessage(payload.error ?? "Upload failed.");
      if (payload.files?.length) onUploaded(payload.files);
    } catch {
      setMessage("Upload failed. Check your connection and try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <span className={cn("inline-flex flex-col items-start gap-1", className)}>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        accept="image/*,video/mp4,video/webm,application/pdf"
        onChange={(event) => {
          if (event.target.files?.length) void upload(event.target.files);
        }}
      />
      <button
        type="button"
        className="a-btn a-btn-primary a-btn-sm"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? <Spinner /> : <Icon name="upload" size={14} />}
        {busy ? "Uploading…" : label}
      </button>
      {message && <span className="a-error max-w-xs">{message}</span>}
    </span>
  );
}
