import { useLocation } from 'react-router-dom'

/**
 * Shop/Programs/Blog (and their detail pages) are mounted twice: once under
 * the public Layout for anonymous browsing, and once under /dashboard for
 * logged-in customers, so navigating between products/programs/posts never
 * bounces a logged-in customer out of the dashboard shell back to the public
 * site. This resolves an internal link to whichever mount the page is
 * currently rendered under.
 */
export function usePortalPath() {
  const { pathname } = useLocation()
  const inDashboard = pathname.startsWith('/dashboard')

  return (path) => (inDashboard ? `/dashboard${path}` : path)
}
