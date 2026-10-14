import { asyncHandler } from '../utils/asyncHandler.js'
import { getHomeContentRow, withDefaults } from '../utils/homeContent.js'
import { sanitizeUrls } from '../utils/safeUrl.js'

export const getHomeContent = asyncHandler(async (req, res) => {
  const row = await getHomeContentRow()
  res.json({ data: withDefaults(row.data) })
})

export const updateHomeContent = asyncHandler(async (req, res) => {
  const row = await getHomeContentRow()
  const incoming = sanitizeUrls(req.body ?? {})

  const merged = withDefaults({ ...row.data, ...incoming })
  row.data = merged
  row.changed('data', true)
  await row.save()

  res.json({ data: merged })
})
