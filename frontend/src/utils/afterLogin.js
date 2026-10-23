/**
 * Where to send someone once they are signed in, kept in sessionStorage so it
 * survives the register -> verify email detour. Optionally carries the item she
 * was adding when we asked her to log in, so it lands in her cart.
 */
const KEY = 'sheshape.afterLogin'

export function rememberReturn(path, item = null) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ path, item, at: Date.now() }))
  } catch {
    // private mode: she just lands on the dashboard
  }
}

export function readReturn() {
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(KEY))
    // Only for this visit: an hour is plenty to log in or register.
    if (!saved || Date.now() - saved.at > 60 * 60 * 1000) return null
    return saved
  } catch {
    return null
  }
}

export function clearReturn() {
  try {
    window.sessionStorage.removeItem(KEY)
  } catch {
    // nothing to clear
  }
}

/** The page she was on, moved into the customer area when there is one. */
const DASHBOARD_TWINS = /^\/(shop|product\/|programs|blog)/

export function returnPathFor(pathname) {
  if (!pathname || /^\/(login|register|verify-email|forgot-password|reset-password)/.test(pathname)) return null
  return DASHBOARD_TWINS.test(pathname) ? `/dashboard${pathname}` : pathname
}

/** Where a fresh sign-in should land. */
export function resolveAfterLogin(fromPath, role) {
  const fallback = role === 'admin' ? '/admin' : '/dashboard'
  const path = fromPath || readReturn()?.path
  if (!path) return fallback
  if (path.startsWith('/admin') && role !== 'admin') return fallback
  // Customer pages are not for admins (they would be bounced anyway).
  if (path.startsWith('/dashboard') && role === 'admin') return fallback
  return path
}

/** resolveAfterLogin for the moment she actually signs in: the saved page is used up, a pending item stays for the product page. */
export function takeAfterLogin(fromPath, role) {
  const target = resolveAfterLogin(fromPath, role)
  const saved = readReturn()
  if (saved?.item && role !== 'admin') rememberReturn(null, saved.item)
  else clearReturn()
  return target
}
