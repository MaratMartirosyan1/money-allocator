import { useEffect } from 'react'
import { useAllocatorStore } from './useAllocatorStore'

/**
 * Reflects the chosen theme onto `<html>`. `system` removes the attribute
 * entirely so the stylesheet's `prefers-color-scheme` rules take over — an
 * explicit choice is an override, not a third palette.
 *
 * The same attribute is set by a tiny inline script in `index.html` before
 * React mounts, which is what stops a light flash on load for dark-theme
 * users. This hook keeps it in sync afterwards.
 */
export function useAppliedTheme(): void {
  const theme = useAllocatorStore((s) => s.theme)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
  }, [theme])
}
