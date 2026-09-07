import { useSyncExternalStore } from 'react'
import { DESKTOP_METRICS, TOUCH_METRICS, type NodeMetrics } from './treeLayout'

const TOUCH_QUERY = '(pointer: coarse)'

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const query = window.matchMedia(TOUCH_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function isTouch(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(TOUCH_QUERY).matches
}

/**
 * Which card metrics the layout should use, following the *primary* pointer.
 *
 * `useSyncExternalStore` rather than an effect and a piece of state: the value
 * is read during render, so the first paint already has the right node heights
 * instead of laying out at desktop sizes and re-flowing a frame later.
 */
export function useLayoutMetrics(): NodeMetrics {
  const touch = useSyncExternalStore(subscribe, isTouch, () => false)
  return touch ? TOUCH_METRICS : DESKTOP_METRICS
}
