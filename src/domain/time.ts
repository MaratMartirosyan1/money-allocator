const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['week', 7 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
]

/** Wording that has to come from the caller's dictionary, not from `Intl`. */
export interface RelativeTimeLabels {
  justNow: string
  never: string
}

const EN_LABELS: RelativeTimeLabels = { justNow: 'just now', never: 'never' }

/**
 * "just now", "3 minutes ago", "last week". Used on the diagram cards to make
 * it obvious that edits are already saved — there is no save button because
 * there is nothing to save.
 *
 * `Intl.RelativeTimeFormat` handles every language it is given; only the two
 * labels outside its remit come in through `opts.labels`.
 */
export function formatRelativeTime(
  iso: string,
  now: number = Date.now(),
  opts: { locale?: string; labels?: RelativeTimeLabels } = {},
): string {
  const labels = opts.labels ?? EN_LABELS
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return labels.never

  const elapsed = now - then
  if (elapsed < 45_000) return labels.justNow

  const format = new Intl.RelativeTimeFormat(opts.locale, { numeric: 'auto' })
  for (const [unit, ms] of UNITS) {
    if (Math.abs(elapsed) >= ms) {
      return format.format(-Math.round(elapsed / ms), unit)
    }
  }
  return labels.justNow
}
