export function getPageTitle(pathname, links, fallback) {
  const matches = links.filter((link) =>
    link.end ? pathname === link.to : pathname === link.to || pathname.startsWith(`${link.to}/`)
  )

  if (matches.length === 0) return fallback

  return matches.reduce((best, current) => (current.to.length > best.to.length ? current : best)).label
}
