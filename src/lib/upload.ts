import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import sharp from "sharp";

export const IMAGE_MIME = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/svg+xml",
];
export const DOC_MIME = ["application/pdf"];
export const VIDEO_MIME = ["video/mp4", "video/webm"];

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
  "application/pdf": ".pdf",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
};

/** Magic-number check: never trust the MIME type the browser reports. */
function sniffMime(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;
  const hex = buffer.subarray(0, 12).toString("hex").toLowerCase();
  const ascii = buffer.subarray(0, 512).toString("utf8");

  if (hex.startsWith("89504e470d0a1a0a")) return "image/png";
  if (hex.startsWith("ffd8ff")) return "image/jpeg";
  if (hex.startsWith("47494638")) return "image/gif";
  if (hex.startsWith("25504446")) return "application/pdf";
  if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
    return "image/webp";
  }
  if (buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buffer.subarray(8, 12).toString("ascii");
    if (brand.startsWith("avif") || brand.startsWith("avis")) return "image/avif";
    return "video/mp4";
  }
  if (hex.startsWith("1a45dfa3")) return "video/webm";
  if (/^\s*(<\?xml[\s\S]{0,200}?)?<svg[\s>]/i.test(ascii)) return "image/svg+xml";
  return null;
}

/**
 * SVGs are XML and can carry scripts, so anything executable is stripped before
 * the file is written. Uploaded SVGs are also served with X-Content-Type-Options.
 */
function sanitizeSvg(input: string): string {
  return input
    .replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, "")
    .replace(/<\s*script[^>]*\/>/gi, "")
    .replace(/<\s*foreignObject[\s\S]*?<\s*\/\s*foreignObject\s*>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|xlink:href)\s*=\s*("|')\s*javascript:[^"']*\2/gi, "")
    .replace(/<!ENTITY[\s\S]*?>/gi, "");
}

export type SavedFile = {
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
};

export type UploadOptions = {
  allowedMime?: string[];
  maxBytes?: number;
  folder?: string;
  /** Downscale large raster images so the media library never serves 8 MB JPEGs. */
  optimizeImages?: boolean;
  maxDimension?: number;
};

export function maxUploadBytes(): number {
  const mb = Number(process.env.MAX_UPLOAD_MB ?? 8);
  return (Number.isFinite(mb) && mb > 0 ? mb : 8) * 1024 * 1024;
}

export async function saveUpload(
  file: File,
  options: UploadOptions = {},
): Promise<{ ok: true; file: SavedFile } | { ok: false; error: string }> {
  const {
    allowedMime = [...IMAGE_MIME, ...DOC_MIME, ...VIDEO_MIME],
    maxBytes = maxUploadBytes(),
    folder = "general",
    optimizeImages = true,
    maxDimension = 2400,
  } = options;

  if (file.size === 0) return { ok: false, error: "The file is empty." };
  if (file.size > maxBytes) {
    return { ok: false, error: `File is larger than ${Math.round(maxBytes / 1024 / 1024)} MB.` };
  }

  let buffer = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffMime(buffer);
  if (!sniffed) return { ok: false, error: "Unrecognised file type." };
  if (!allowedMime.includes(sniffed)) {
    return { ok: false, error: `Files of type ${sniffed} are not allowed here.` };
  }

  let width: number | undefined;
  let height: number | undefined;
  let mimeType = sniffed;

  if (sniffed === "image/svg+xml") {
    buffer = Buffer.from(sanitizeSvg(buffer.toString("utf8")), "utf8");
  } else if (sniffed.startsWith("image/") && optimizeImages) {
    try {
      const image = sharp(buffer, { animated: sniffed === "image/gif" });
      const metadata = await image.metadata();
      width = metadata.width;
      height = metadata.height;
      const tooLarge = (metadata.width ?? 0) > maxDimension || (metadata.height ?? 0) > maxDimension;
      if (tooLarge && sniffed !== "image/gif") {
        const resized = await image
          .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 84 })
          .toBuffer({ resolveWithObject: true });
        buffer = Buffer.from(resized.data);
        width = resized.info.width;
        height = resized.info.height;
        mimeType = "image/webp";
      }
    } catch {
      return { ok: false, error: "That image could not be processed." };
    }
  }

  const safeFolder = folder.replace(/[^a-z0-9-_]/gi, "").slice(0, 40) || "general";
  const extension = EXTENSION_BY_MIME[mimeType] ?? "";
  const filename = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}${extension}`;
  const directory = path.join(process.cwd(), "public", "uploads", safeFolder);

  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), buffer);

  return {
    ok: true,
    file: {
      filename,
      url: `/uploads/${safeFolder}/${filename}`,
      mimeType,
      size: buffer.length,
      width,
      height,
    },
  };
}

/**
 * Attachments submitted through a public form are written OUTSIDE /public so
 * they are never directly reachable — the admin downloads them through an
 * authenticated route.
 */
export async function savePrivateUpload(
  file: File,
  maxBytes = maxUploadBytes(),
): Promise<{ ok: true; storedAs: string; mimeType: string; size: number } | { ok: false; error: string }> {
  if (file.size === 0) return { ok: false, error: "The file is empty." };
  if (file.size > maxBytes) {
    return { ok: false, error: `File is larger than ${Math.round(maxBytes / 1024 / 1024)} MB.` };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffMime(buffer);
  const allowed = [...IMAGE_MIME.filter((mime) => mime !== "image/svg+xml"), ...DOC_MIME];
  if (!sniffed || !allowed.includes(sniffed)) {
    return { ok: false, error: "Only images and PDF files can be attached." };
  }

  const extension = EXTENSION_BY_MIME[sniffed] ?? "";
  const storedAs = `${Date.now().toString(36)}-${randomBytes(10).toString("hex")}${extension}`;
  const directory = path.join(process.cwd(), "storage", "submissions");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, storedAs), buffer);

  return { ok: true, storedAs, mimeType: sniffed, size: buffer.length };
}
