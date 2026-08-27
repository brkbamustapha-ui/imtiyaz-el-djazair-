import "server-only";
import { db } from "./db";

/**
 * Storage for files uploaded at runtime.
 *
 * These used to be written under ./storage. That works on a machine you own and
 * nowhere else: a serverless host mounts a read-only filesystem and gives every
 * invocation its own copy, so a file written while handling one request is gone
 * by the next one — the upload appears to succeed and the image 404s forever.
 *
 * So the bytes live in the database, addressed by `key`: exactly the path that
 * appears in the URL (`general/mfk3d-a1b2.webp` -> `/media/general/mfk3d-a1b2.webp`).
 * One code path locally and in production, and no second service to configure.
 *
 * Files that are part of the design — the logo, the partner marks, the campus
 * photographs — are NOT here. They are committed under public/assets and served
 * as static files, which is both faster and free.
 */

/** A key is one or more plain path segments: `folder/name.ext`. */
const KEY = /^[A-Za-z0-9._-]{1,120}(\/[A-Za-z0-9._-]{1,120}){0,3}$/;

export function isValidKey(key: string): boolean {
  return KEY.test(key) && !key.split("/").some((segment) => segment.startsWith("."));
}

export type StoredBlob = { data: Uint8Array; mimeType: string; size: number };

export async function putFile(
  key: string,
  data: Buffer | Uint8Array,
  mimeType: string,
  isPrivate = false,
): Promise<void> {
  if (!isValidKey(key)) throw new Error(`Refusing to store an invalid key: ${key}`);
  // Prisma's Bytes column wants a Uint8Array over a plain ArrayBuffer. A Node
  // Buffer can sit on a SharedArrayBuffer, which that type rejects, so copy it
  // into a fresh one rather than casting the difference away.
  const bytes = new Uint8Array(data);
  await db.storedFile.upsert({
    where: { key },
    create: { key, data: bytes, mimeType, size: bytes.length, isPrivate },
    update: { data: bytes, mimeType, size: bytes.length, isPrivate },
  });
}

/**
 * `wantPrivate` is required rather than optional on purpose: /media must never
 * be able to hand out a form attachment, and an argument you have to pass is
 * harder to forget than a flag you have to remember to check.
 */
export async function getFile(key: string, wantPrivate: boolean): Promise<StoredBlob | null> {
  if (!isValidKey(key)) return null;
  const row = await db.storedFile.findUnique({
    where: { key },
    select: { data: true, mimeType: true, size: true, isPrivate: true },
  });
  if (!row || row.isPrivate !== wantPrivate) return null;
  // Prisma hands back a Uint8Array for Bytes; Buffer is a subclass of it.
  return { data: row.data, mimeType: row.mimeType, size: row.size };
}

export async function fileExists(key: string): Promise<boolean> {
  if (!isValidKey(key)) return false;
  const row = await db.storedFile.findUnique({ where: { key }, select: { key: true } });
  return row !== null;
}

/** Deleting a key that is not there is not an error — the goal is that it is gone. */
export async function deleteFile(key: string): Promise<void> {
  if (!isValidKey(key)) return;
  await db.storedFile.delete({ where: { key } }).catch(() => undefined);
}

/** `/media/general/x.webp` -> `general/x.webp`. Null for anything else. */
export function keyFromMediaUrl(url: string | null | undefined): string | null {
  if (!url || !url.startsWith("/media/")) return null;
  const key = url.slice("/media/".length);
  return isValidKey(key) ? key : null;
}
