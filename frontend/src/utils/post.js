export function formatPostDate(value) {
  if (!value) return ''

  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

export function toParagraphs(body) {
  return String(body ?? '')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
}

export function readingMinutes(body) {
  const words = String(body ?? '').trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}
