import { useEffect, useRef, useState } from 'react'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Marks an element visible once it scrolls into view, for entrance
 * animations. Respects reduced-motion by showing everything immediately.
 */
export function useReveal({ threshold = 0.12, rootMargin = '0px 0px -8% 0px' } = {}) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(() => prefersReducedMotion() || typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const node = ref.current
    if (!node || visible) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [threshold, rootMargin, visible])

  return [ref, visible]
}
