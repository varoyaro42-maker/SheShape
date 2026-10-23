import path from 'node:path';
import multer from 'multer';
import { HttpError } from '../utils/httpError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { kindFor, checkFile, localPathFor, storageDriver } from '../utils/storage.js';

/**
 * Two-step upload used by every uploader in the app:
 *  1. POST .../prepare { kind, contentType, size } -> how to send the file
 *  2. send it: PUT to S3 (s3 driver) or multipart POST to .../file (local)
 */
export const prepare = (allowed) =>
  asyncHandler(async (req, res) => {
    const name = String(req.body?.kind ?? allowed[0]).toLowerCase();
    if (!allowed.includes(name)) throw new HttpError(400, 'That upload is not allowed here');

    const kind = kindFor(name);
    const contentType = String(req.body?.contentType ?? '').toLowerCase();
    const extension = checkFile(kind, { contentType, size: Number(req.body?.size) });

    if (storageDriver() === 's3') {
      const { createS3Upload } = await import('../utils/s3.js');
      const upload = await createS3Upload({
        prefix: kind.prefix,
        contentType,
        extension,
        expiresIn: kind.prefix === 'videos' ? 900 : 60,
      });
      return res.json({ data: { method: 'PUT', uploadUrl: upload.uploadUrl, url: upload.url } });
    }

    const fileUrl = req.originalUrl.replace(/\/prepare(\?.*)?$/, '/file');
    res.json({ data: { method: 'POST', uploadUrl: `${fileUrl}?kind=${name}`, url: null } });
  });

// The file streams straight to its final name under the uploads folder, so a
// 1 GB video never sits in memory.
const storage = multer.diskStorage({
  destination: (req, file, done) => {
    try {
      const kind = kindFor(req.query.kind);
      const extension = checkFile(kind, { contentType: file.mimetype, size: 1 });
      req.uploadTarget = localPathFor(kind, extension);
      done(null, path.dirname(req.uploadTarget.file));
    } catch (error) {
      done(error);
    }
  },
  filename: (req, file, done) => done(null, path.basename(req.uploadTarget.file)),
});

// One multer instance per size limit, so an image upload is cut off at the
// image limit instead of streaming a whole video's worth to disk first.
const receivers = new Map();
const receiverFor = (kind) => {
  if (!receivers.has(kind.max)) {
    receivers.set(
      kind.max,
      multer({
        storage,
        limits: { fileSize: kind.max, files: 1 },
        fileFilter: (req, file, done) => {
          try {
            checkFile(kindFor(req.query.kind), { contentType: file.mimetype, size: 1 });
            done(null, true);
          } catch (error) {
            done(error);
          }
        },
      }).single('file')
    );
  }
  return receivers.get(kind.max);
};

export const receiveFile = (allowed) => [
  (req, res, next) => {
    const name = String(req.query.kind ?? '').toLowerCase();
    if (!allowed.includes(name)) return next(new HttpError(400, 'That upload is not allowed here'));
    next();
  },
  (req, res, next) =>
    receiverFor(kindFor(req.query.kind))(req, res, (error) => {
      if (error instanceof multer.MulterError) {
        return next(new HttpError(400, error.code === 'LIMIT_FILE_SIZE' ? 'That file is too large' : error.message));
      }
      next(error);
    }),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'No file was sent');

    res.status(201).json({ data: { url: req.uploadTarget.url, size: req.file.size } });
  }),
];
