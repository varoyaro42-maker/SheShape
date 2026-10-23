import '../loadEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import * as models from '../models/index.js'
import { uploadsDir, collectOwnUploads } from '../utils/storage.js'

/**
 * Removes files in the uploads folder that nothing in the database points at
 * (uploads that were never saved, or leftovers from before cleanup existed).
 * Files younger than an hour are left alone: an admin may still be filling in
 * the form they belong to. Pass --dry-run to only list what would go.
 */
const MIN_AGE_MS = 60 * 60 * 1000
const dryRun = process.argv.includes('--dry-run')

const parseJson = (value) => {
  if (typeof value !== 'string' || !/^[[{]/.test(value.trim())) return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

async function referencedUrls() {
  const urls = new Set()
  for (const Model of Object.values(models)) {
    if (typeof Model !== 'function' || !Model.tableName || typeof Model.findAll !== 'function') continue
    const rows = await Model.findAll({ raw: true })
    for (const row of rows) {
      for (const value of Object.values(row)) collectOwnUploads(parseJson(value), urls)
    }
  }
  return urls
}

function* walk(dir) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(full)
    else if (entry.isFile()) yield full
  }
}

async function run() {
  await models.sequelize.authenticate()
  const keep = await referencedUrls()
  const root = uploadsDir()
  let removed = 0
  let kept = 0
  let bytes = 0

  for (const file of walk(root)) {
    const url = '/uploads/' + path.relative(root, file).split(path.sep).join('/')
    const stat = fs.statSync(file)
    if (keep.has(url) || Date.now() - stat.mtimeMs < MIN_AGE_MS) {
      kept += 1
      continue
    }
    removed += 1
    bytes += stat.size
    console.log(`${dryRun ? 'would remove' : 'removed'} ${url} (${Math.round(stat.size / 1024)} KB)`)
    if (!dryRun) fs.unlinkSync(file)
  }

  console.log(`${dryRun ? 'Would remove' : 'Removed'} ${removed} file(s), ${(bytes / 1024 / 1024).toFixed(1)} MB; ${kept} in use.`)
}

run()
  .catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
  .finally(() => models.sequelize.close())
