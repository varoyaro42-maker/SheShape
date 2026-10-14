/**
 * Only http(s) URLs and site-relative paths are allowed anywhere an admin can
 * type a link or image address. Blocks javascript:, data: and similar.
 */
export function safeUrl(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : ''
  } catch {
    return ''
  }
}

const URL_KEYS = /(url|href|image)$/i

/** Walks a JSON value and cleans every string under a key that names a URL. */
export function sanitizeUrls(value, key = '') {
  if (Array.isArray(value)) return value.map((item) => sanitizeUrls(item, key))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitizeUrls(v, k)]))
  }
  if (typeof value === 'string' && URL_KEYS.test(key)) return safeUrl(value)
  return value
}
