import { randomUUID } from 'node:crypto';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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

const bucket = process.env.S3_BUCKET;
const publicUrl = process.env.S3_PUBLIC_URL;

const client = new S3Client({ region: process.env.AWS_REGION });

export const createUpload = async ({ prefix, contentType, extension, expiresIn = 60 }) => {
  const key = `${prefix}${randomUUID()}.${extension}`;

  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
    { expiresIn }
  );

  return { uploadUrl, key, url: `${publicUrl}/${key}` };
};

export const createProductImageUpload = (contentType) =>
  createUpload({ prefix: 'products/', contentType, extension: ALLOWED_IMAGE_TYPES[contentType] });

export const createAvatarUpload = (contentType) =>
  createUpload({ prefix: 'avatars/', contentType, extension: ALLOWED_IMAGE_TYPES[contentType] });

export const createHomeImageUpload = (contentType) =>
  createUpload({ prefix: 'home/', contentType, extension: ALLOWED_IMAGE_TYPES[contentType] });

export const createProgramVideoUpload = (contentType) =>
  createUpload({
    prefix: 'programs/videos/',
    contentType,
    extension: ALLOWED_VIDEO_TYPES[contentType],
    expiresIn: 900,
  });

export const deleteImageByUrl = async (url) => {
  if (typeof url !== 'string' || !url.startsWith(`${publicUrl}/`)) return false;

  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: url.slice(publicUrl.length + 1) }));

  return true;
};
