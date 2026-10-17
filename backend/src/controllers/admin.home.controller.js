import { asyncHandler } from '../utils/asyncHandler.js'
import { getHomeContentRow, withDefaults } from '../utils/homeContent.js'
import { sanitizeUrls } from '../utils/safeUrl.js'
import { collectOwnUploads, deleteByUrl } from '../utils/storage.js'

export const getHomeContent = asyncHandler(async (req, res) => {
  const row = await getHomeContentRow()
  res.json({ data: withDefaults(row.data) })
})

export const updateHomeContent = asyncHandler(async (req, res) => {
  const row = await getHomeContentRow()
  const incoming = sanitizeUrls(req.body ?? {})

  const before = collectOwnUploads(row.data)
  const merged = withDefaults({ ...row.data, ...incoming })
  row.data = merged
  row.changed('data', true)
  await row.save()

  // Anything the admin removed or replaced is no longer referenced; drop the file as well.
  const after = collectOwnUploads(merged)
  for (const url of before) {
    if (!after.has(url)) deleteByUrl(url).catch((error) => console.error('Delete failed for', url, error.message))
  }

  res.json({ data: merged })
})
