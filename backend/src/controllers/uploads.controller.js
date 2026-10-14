import { HttpError } from '../utils/httpError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  createProductImageUpload,
  createAvatarUpload,
  createProgramVideoUpload,
  createHomeImageUpload,
} from '../utils/s3.js';

function readContentTypeAndSize(req) {
  const contentType = String(req.body?.contentType ?? '').toLowerCase();
  const size = Number(req.body?.size);
  return { contentType, size };
}

export const presignProductImage = asyncHandler(async (req, res) => {
  const { contentType, size } = readContentTypeAndSize(req);

  if (!ALLOWED_IMAGE_TYPES[contentType]) {
    throw new HttpError(400, 'Images must be JPEG, PNG or WebP');
  }

  if (!Number.isFinite(size) || size <= 0) {
    throw new HttpError(400, 'The file size is missing');
  }

  if (size > MAX_IMAGE_BYTES) {
    throw new HttpError(400, 'Images must be smaller than 5 MB');
  }

  res.json({ data: await createProductImageUpload(contentType) });
});

export const presignAvatarImage = asyncHandler(async (req, res) => {
  const { contentType, size } = readContentTypeAndSize(req);

  if (!ALLOWED_IMAGE_TYPES[contentType]) {
    throw new HttpError(400, 'Images must be JPEG, PNG or WebP');
  }

  if (!Number.isFinite(size) || size <= 0) {
    throw new HttpError(400, 'The file size is missing');
  }

  if (size > MAX_IMAGE_BYTES) {
    throw new HttpError(400, 'Images must be smaller than 5 MB');
  }

  res.json({ data: await createAvatarUpload(contentType) });
});

export const presignHomeImage = asyncHandler(async (req, res) => {
  const { contentType, size } = readContentTypeAndSize(req);

  if (!ALLOWED_IMAGE_TYPES[contentType]) {
    throw new HttpError(400, 'Images must be JPEG, PNG or WebP');
  }

  if (!Number.isFinite(size) || size <= 0) {
    throw new HttpError(400, 'The file size is missing');
  }

  if (size > MAX_IMAGE_BYTES) {
    throw new HttpError(400, 'Images must be smaller than 5 MB');
  }

  res.json({ data: await createHomeImageUpload(contentType) });
});

export const presignProgramVideo = asyncHandler(async (req, res) => {
  const { contentType, size } = readContentTypeAndSize(req);

  if (!ALLOWED_VIDEO_TYPES[contentType]) {
    throw new HttpError(400, 'Videos must be MP4, MOV or WebM');
  }

  if (!Number.isFinite(size) || size <= 0) {
    throw new HttpError(400, 'The file size is missing');
  }

  if (size > MAX_VIDEO_BYTES) {
    throw new HttpError(400, 'Videos must be smaller than 1 GB');
  }

  res.json({ data: await createProgramVideoUpload(contentType) });
});
