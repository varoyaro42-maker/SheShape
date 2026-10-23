import slugify from 'slugify'
import { Op } from 'sequelize'

export async function buildUniqueSlug(model, value, { excludeId = null, transaction = null } = {}) {
  const base = slugify(value, { lower: true, strict: true, trim: true })
  let candidate = base
  let suffix = 1

  while (true) {
    const where = { slug: candidate }
    if (excludeId) where.id = { [Op.ne]: excludeId }

    const existing = await model.findOne({ where, attributes: ['id'], transaction })
    if (!existing) return candidate

    suffix += 1
    candidate = `${base}-${suffix}`
  }
}
