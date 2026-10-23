import { asyncHandler } from '../utils/asyncHandler.js'
import { getHomeContentRow, withDefaults } from '../utils/homeContent.js'

export const getHomeContent = asyncHandler(async (req, res) => {
  const row = await getHomeContentRow()
  res.json({ data: withDefaults(row.data) })
})
