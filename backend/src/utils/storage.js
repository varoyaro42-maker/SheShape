import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { HttpError } from './httpError.js';

/**
 * Where uploaded files live.
 *
 * - local (default): files are written to UPLOADS_DIR (backend/uploads by
 *   default) and served by this app at /uploads/... . Works on cPanel with no
 *   external account. Keep the folder out of deploys and back it up.
 * - s3: the browser uploads straight to Amazon S3 using a presigned URL.
 *   Needs AWS_* and S3_* in the environment.
 */
export const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const ALLOWED_VIDEO_TYPES = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
};

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 1024 * 1024 * 1024;

/** What each upload kind accepts, where it goes, and who may send it. */
export const UPLOAD_KINDS = {
  product: { prefix: 'products', types: ALLOWED_IMAGE_TYPES, max: MAX_IMAGE_BYTES, label: 'Images must be JPEG, PNG or WebP under 5 MB' },
  home: { prefix: 'home', types: ALLOWED_IMAGE_TYPES, max: MAX_IMAGE_BYTES, label: 'Images must be JPEG, PNG or WebP under 5 MB' },
  avatar: { prefix: 'avatars', types: ALLOWED_IMAGE_TYPES, max: MAX_IMAGE_BYTES, label: 'Images must be JPEG, PNG or WebP under 5 MB' },
  video: { prefix: 'videos', types: ALLOWED_VIDEO_TYPES, max: MAX_VIDEO_BYTES, label: 'Videos must be MP4, MOV or WebM under 1 GB' },
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const uploadsDir = () => path.resolve(process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads'));

export const storageDriver = () => (process.env.STORAGE_DRIVER === 's3' ? 's3' : 'local');

export function kindFor(name) {
  const kind = UPLOAD_KINDS[String(name ?? '').toLowerCase()];
  if (!kind) throw new HttpError(400, 'Unknown upload kind');
  return kind;
}

/** Validates the declared type and size for a kind; returns the extension. */
export function checkFile(kind, { contentType, size }) {
  const type = String(contentType ?? '').toLowerCase();
  const extension = kind.types[type];
  if (!extension) throw new HttpError(400, kind.label);
  if (!Number.isFinite(size) || size <= 0) throw new HttpError(400, 'The file size is missing');
  if (size > kind.max) throw new HttpError(400, kind.label);
  return extension;
}

export function localPathFor(kind, extension) {
  const name = `${randomUUID()}.${extension}`;
  const dir = path.join(uploadsDir(), kind.prefix);
  fs.mkdirSync(dir, { recursive: true });
  return { file: path.join(dir, name), url: `/uploads/${kind.prefix}/${name}` };
}

/** Removes a file this app stored, whichever driver wrote it. Silent on misses. */
export async function deleteByUrl(url) {
  if (typeof url !== 'string') return false;

  if (url.startsWith('/uploads/')) {
    const relative = url.slice('/uploads/'.length);
    const target = path.resolve(uploadsDir(), relative);
    if (!target.startsWith(uploadsDir() + path.sep)) return false;
    await fs.promises.unlink(target).catch(() => {});
    return true;
  }

  const publicUrl = process.env.S3_PUBLIC_URL;
  if (publicUrl && url.startsWith(`${publicUrl}/`)) {
    const { deleteS3Object } = await import('./s3.js');
    await deleteS3Object(url.slice(publicUrl.length + 1));
    return true;
  }

  return false;
}

export const deleteImageByUrl = deleteByUrl;

/** True when a URL points at a file this app stored under the given kind. */
export function isOwnUpload(url, kind) {
  if (typeof url !== 'string') return false;
  if (url.startsWith(`/uploads/${kind.prefix}/`)) return true;
  const publicUrl = (process.env.S3_PUBLIC_URL || '').replace(/\/$/, '');
  return Boolean(publicUrl) && url.startsWith(`${publicUrl}/${kind.prefix}/`);
}
