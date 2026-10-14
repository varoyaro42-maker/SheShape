import { HttpError } from '../utils/httpError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { deleteImageByUrl } from '../utils/s3.js';

export const updateAvatar = asyncHandler(async (req, res) => {
  const url = String(req.body?.url ?? '').trim();

  if (!url) {
    throw new HttpError(400, 'A url is required');
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
