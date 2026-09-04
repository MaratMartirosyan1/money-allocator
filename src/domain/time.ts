const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['week', 7 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
]

/**
 * "just now", "3 minutes ago", "last week". Used on the diagram cards to make
 * it obvious that edits are already saved — there is no save button because
 * there is nothing to save.
 */
export function formatRelativeTime(
  iso: string,
  now: number = Date.now(),
): string {
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return 'never'

  const elapsed = now - then
  if (elapsed < 45_000) return 'just now'

  const format = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  for (const [unit, ms] of UNITS) {
    if (Math.abs(elapsed) >= ms) {
      return format.format(-Math.round(elapsed / ms), unit)
    }
  }
  return 'just now'
}
