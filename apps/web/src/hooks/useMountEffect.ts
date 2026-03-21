import { useEffect } from 'react'

/**
 * The ONLY sanctioned place for useEffect in the entire codebase.
 *
 * Use sparingly — most "mount" logic can be avoided via:
 * - derived state / useMemo
 * - TanStack Query for data fetching
 * - event handlers for side effects
 * - key={} for remounts
 */
export function useMountEffect(fn: () => void | (() => void)) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const cleanup = fn()
    return cleanup as (() => void) | undefined
  }, [])
}
