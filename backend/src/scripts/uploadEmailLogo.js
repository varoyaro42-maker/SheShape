import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logoPath = path.resolve(__dirname, '../../../frontend/public/logo-light.svg');

const bucket = process.env.S3_BUCKET;
const publicUrl = process.env.S3_PUBLIC_URL;
const key = 'email-assets/logo-light.svg';

const client = new S3Client({ region: process.env.AWS_REGION });

const body = fs.readFileSync(logoPath);

await client.send(
  new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: 'image/svg+xml',
    CacheControl: 'public, max-age=31536000, immutable',
  })
);

console.log(`Uploaded. Public URL: ${publicUrl}/${key}`);
