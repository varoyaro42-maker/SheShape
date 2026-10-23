import { asyncHandler } from '../utils/asyncHandler.js'
import { deleteImageByUrl } from '../utils/storage.js'
import { buildUniqueSlug } from '../utils/slug.js'
import { sequelize, Program, ProgramVideo, PROGRAM_STATUSES } from '../models/index.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const withVideos = {
  model: ProgramVideo,
  as: 'videos',
  attributes: ['id', 'title', 'url', 'sortOrder']
}

const videosFirst = [[{ model: ProgramVideo, as: 'videos' }, 'sortOrder', 'ASC']]

function fail(status, message, details) {
  const error = new Error(message)
  error.status = status
  if (details) error.details = details
  return error
}

function invalid(field, message) {
  return fail(400, message, [{ field, message }])
}

function readString(body, field, { max, required }) {
  const raw = body[field]
  const value = typeof raw === 'string' ? raw.trim() : ''

  if (!value) {
    if (required) throw invalid(field, `${field} is required.`)
    return ''
  }

  if (max && value.length > max) {
    throw invalid(field, `${field} must be ${max} characters or fewer.`)
  }

  return value
}

function readStatus(body, { required }) {
  const raw = body.status

  if (raw === undefined || raw === null || raw === '') {
    if (required) throw invalid('status', 'status is required.')
    return undefined
  }

  const value = String(raw).trim()

  if (!PROGRAM_STATUSES.includes(value)) {
    throw invalid('status', `status must be one of: ${PROGRAM_STATUSES.join(', ')}.`)
  }

  return value
}

function readHighlights(body) {
  const raw = body.highlights

  if (raw === undefined) return undefined
  if (raw === null) return []
  if (!Array.isArray(raw)) throw invalid('highlights', 'highlights must be a list of strings.')

  return raw.map((item) => String(item).trim()).filter(Boolean)
}

function readSchedule(body) {
  const raw = body.schedule

  if (raw === undefined) return undefined
  if (raw === null) return []
  if (!Array.isArray(raw)) throw invalid('schedule', 'schedule must be a list of sessions.')

  return raw
    .map((entry) => ({
      day: String(entry?.day ?? '').trim().slice(0, 40),
      time: String(entry?.time ?? '').trim().slice(0, 40),
      note: String(entry?.note ?? '').trim().slice(0, 120)
    }))
    .filter((entry) => entry.day || entry.time || entry.note)
}

function readNullableInteger(body, field, { min }) {
  const raw = body[field]
  if (raw === undefined) return undefined
  if (raw === null || raw === '') return null

  const value = Number(raw)
  if (!Number.isInteger(value) || value < min) {
    throw invalid(field, `${field} must be a whole number of ${min} or more.`)
  }

  return value
}

function readBoolean(body, field) {
  const raw = body[field]
  if (raw === undefined) return undefined
  if (typeof raw === 'boolean') return raw
  if (raw === 'true') return true
  if (raw === 'false') return false
  throw invalid(field, `${field} must be true or false.`)
}

function readInteger(body, field) {
  const raw = body[field]
  if (raw === undefined || raw === null || raw === '') return undefined

  const value = Number(raw)
  if (!Number.isInteger(value)) throw invalid(field, `${field} must be a whole number.`)

  return value
}

function buildPayload(body, { partial }) {
  const has = (field) => Object.prototype.hasOwnProperty.call(body, field)
  const payload = {}

  if (!partial || has('name')) {
    payload.name = readString(body, 'name', { max: 120, required: true })
  }

  if (has('tagline')) payload.tagline = readString(body, 'tagline', { max: 200, required: false })
  if (has('label')) payload.label = readString(body, 'label', { max: 40, required: false })
  if (has('description')) payload.description = readString(body, 'description', { required: false })
  if (has('coverImage')) payload.coverImage = readString(body, 'coverImage', { required: false }) || null

  if (has('highlights')) {
    const highlights = readHighlights(body)
    if (highlights !== undefined) payload.highlights = highlights
  }

  if (!partial || has('status')) {
    const status = readStatus(body, { required: false })
    payload.status = status ?? (partial ? undefined : 'coming_soon')
    if (payload.status === undefined) delete payload.status
  }

  if (has('sortOrder')) {
    const sortOrder = readInteger(body, 'sortOrder')
    if (sortOrder !== undefined) payload.sortOrder = sortOrder
  }

  if (has('slug')) {
    payload.slug = readString(body, 'slug', { max: 140, required: true })
  }

  if (has('price')) {
    const price = readNullableInteger(body, 'price', { min: 0 })
    if (price !== undefined) payload.price = price
  }
  if (has('capacity')) {
    const capacity = readNullableInteger(body, 'capacity', { min: 1 })
    if (capacity !== undefined) payload.capacity = capacity
  }
  if (has('priceNote')) payload.priceNote = readString(body, 'priceNote', { max: 60, required: false })
  if (has('duration')) payload.duration = readString(body, 'duration', { max: 80, required: false })
  if (has('location')) payload.location = readString(body, 'location', { max: 120, required: false })
  if (has('coach')) payload.coach = readString(body, 'coach', { max: 80, required: false })
  if (has('schedule')) {
    const schedule = readSchedule(body)
    if (schedule !== undefined) payload.schedule = schedule
  }
  if (has('bookable')) {
    const bookable = readBoolean(body, 'bookable')
    if (bookable !== undefined) payload.bookable = bookable
  }

  return payload
}

async function findOr404(id, options = {}) {
  if (!UUID_PATTERN.test(String(id))) throw fail(404, 'Program not found.')

  const program = await Program.findByPk(id, options)
  if (!program) throw fail(404, 'Program not found.')

  return program
}

async function nextSortOrder(programId, transaction) {
  const highest = await ProgramVideo.max('sortOrder', { where: { programId }, transaction })
  return Number.isFinite(highest) ? highest + 1 : 0
}

export const list = asyncHandler(async (req, res) => {
  const programs = await Program.findAll({
    include: [withVideos],
    order: [['sortOrder', 'ASC'], ['name', 'ASC'], ...videosFirst]
  })

  res.json({ data: programs })
})

export const detail = asyncHandler(async (req, res) => {
  const program = await findOr404(req.params.id, { include: [withVideos], order: videosFirst })
  res.json({ data: program })
})

export const create = asyncHandler(async (req, res) => {
  const payload = buildPayload(req.body, { partial: false })

  const program = await sequelize.transaction(async (transaction) => {
    payload.slug = await buildUniqueSlug(Program, payload.slug || payload.name, { transaction })
    return Program.create(payload, { transaction })
  })

  const fresh = await Program.findByPk(program.id, { include: [withVideos], order: videosFirst })
  res.status(201).json({ data: fresh })
})

export const update = asyncHandler(async (req, res) => {
  const program = await findOr404(req.params.id)
  const payload = buildPayload(req.body, { partial: true })

  if (payload.slug) {
    payload.slug = await buildUniqueSlug(Program, payload.slug, { excludeId: program.id })
  }

  const previousCover = program.coverImage
  await program.update(payload)

  if (previousCover && payload.coverImage !== undefined && payload.coverImage !== previousCover) {
    deleteImageByUrl(previousCover).catch((error) => console.error('Delete failed for', previousCover, error.message))
  }

  const fresh = await Program.findByPk(program.id, { include: [withVideos], order: videosFirst })
  res.json({ data: fresh })
})

export const remove = asyncHandler(async (req, res) => {
  const program = await findOr404(req.params.id, { include: [withVideos] })

  const urls = program.videos.map((video) => video.url)
  if (program.coverImage) urls.push(program.coverImage)

  await program.destroy()

  await Promise.all(
    urls.map((url) =>
      deleteImageByUrl(url).catch((error) => console.error('S3 delete failed for', url, error.message))
    )
  )

  res.status(204).end()
})

export const attachVideo = asyncHandler(async (req, res) => {
  const program = await findOr404(req.params.id)
  const url = readString(req.body, 'url', { required: true })
  const title = readString(req.body, 'title', { max: 160, required: false }) || 'Untitled video'

  const video = await ProgramVideo.create({
    programId: program.id,
    url,
    title,
    sortOrder: await nextSortOrder(program.id)
  })

  res.status(201).json({ data: video })
})

export const detachVideo = asyncHandler(async (req, res) => {
  const program = await findOr404(req.params.id)

  const video = await ProgramVideo.findOne({ where: { id: req.params.videoId, programId: program.id } })
  if (!video) throw fail(404, 'Video not found on this program.')

  const { url } = video

  await video.destroy()

  deleteImageByUrl(url).catch((error) => console.error('S3 delete failed for', url, error.message))

  res.status(204).end()
})

export const reorderVideos = asyncHandler(async (req, res) => {
  const program = await findOr404(req.params.id)
  const ids = Array.isArray(req.body.ids) ? req.body.ids : null

  if (!ids?.length) throw invalid('ids', 'ids must be a list of video ids.')

  const videos = await ProgramVideo.findAll({ where: { programId: program.id }, attributes: ['id'] })
  const owned = new Set(videos.map((video) => video.id))

  if (ids.length !== owned.size || ids.some((id) => !owned.has(id))) {
    throw invalid('ids', 'ids must list every video on this program exactly once.')
  }

  await sequelize.transaction(async (transaction) => {
    for (const [index, id] of ids.entries()) {
      await ProgramVideo.update({ sortOrder: index }, { where: { id }, transaction })
    }
  })

  const fresh = await ProgramVideo.findAll({
    where: { programId: program.id },
    attributes: ['id', 'title', 'url', 'sortOrder'],
    order: [['sortOrder', 'ASC']]
  })

  res.json({ data: fresh })
})
