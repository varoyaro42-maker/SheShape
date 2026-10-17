import { randomUUID } from 'node:crypto';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/** Amazon S3 driver, used only when STORAGE_DRIVER=s3. */
let client = null;
const getClient = () => (client ??= new S3Client({ region: process.env.AWS_REGION }));

export async function createS3Upload({ prefix, contentType, extension, expiresIn = 60 }) {
  const key = `${prefix}/${randomUUID()}.${extension}`;
  const uploadUrl = await getSignedUrl(
    getClient(),
    new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, ContentType: contentType }),
    { expiresIn }
  );
  return { uploadUrl, key, url: `${process.env.S3_PUBLIC_URL}/${key}` };
}

export async function deleteS3Object(key) {
  await getClient().send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
}
