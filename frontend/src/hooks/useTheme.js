import { useCallback, useState } from 'react'

const STORAGE_KEY = 'sheshape-theme'

function readInitialTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') return stored
  } catch {
    // localStorage unavailable — fall through to default
  }
  return 'light'
}

/**
 * Dark mode is scoped to whichever element the caller applies
 * `data-theme={theme}` to (the dashboard shells), not the whole document —
 * the public storefront pages were never audited for dark-mode contrast.
 */
export function useTheme() {
  const [theme, setTheme] = useState(readInitialTheme)

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // ignore — per-viewer convenience only
      }
      return next
    })
  }, [])

  return { theme, toggleTheme }
}
