import { HttpError } from '../utils/httpError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { deleteImageByUrl, isOwnUpload, UPLOAD_KINDS } from '../utils/storage.js';

export const updateAvatar = asyncHandler(async (req, res) => {
  const url = String(req.body?.url ?? '').trim();

  if (!url) {
    throw new HttpError(400, 'A url is required');
  }

  // Avatars must be files we uploaded to our own bucket.
  if (!isOwnUpload(url, UPLOAD_KINDS.avatar)) {
    throw new HttpError(400, 'Upload the photo through the account page.');
  }

  const previousUrl = req.user.avatarUrl;

  req.user.avatarUrl = url;
  await req.user.save();

  if (previousUrl && previousUrl !== url) {
    deleteImageByUrl(previousUrl).catch((error) => {
      console.error('S3 delete failed for', previousUrl, error.message);
    });
  }

  res.json({ data: req.user });
});
