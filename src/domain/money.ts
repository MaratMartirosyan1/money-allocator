/**
 * All money is carried as integer minor units. AMD has `currencyDecimals: 0`,
 * so a minor unit is one dram; USD would be 2 and a minor unit a cent.
 * Nothing in the engine ever holds a fractional amount.
 */

export function minorFactor(decimals: number): number {
  return 10 ** decimals
}

/**
 * 1_000_000 minor units, 0 decimals → "֏1,000,000" in English, "1 000 000 ֏"
 * in Armenian. `locale` is a BCP 47 tag; leaving it out uses the platform's
 * own locale, which is only right for tests and non-UI callers — the UI passes
 * the app's chosen language through `useFormat()`.
 */
export function formatMoney(
  minorUnits: number,
  currency: string,
  decimals: number,
  locale?: string,
): string {
  const value = minorUnits / minorFactor(decimals)
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value)
  } catch {
    // Unknown currency code — fall back to a plain grouped number.
    return `${formatAmount(minorUnits, decimals, locale)} ${currency}`
  }
}

/** Grouped number with no currency symbol, for tight spaces like node badges. */
export function formatAmount(
  minorUnits: number,
  decimals: number,
  locale?: string,
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(minorUnits / minorFactor(decimals))
}

/** Compact form for large amounts: 1_250_000 → "1.25M" */
export function formatCompact(
  minorUnits: number,
  decimals: number,
  locale?: string,
): string {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(minorUnits / minorFactor(decimals))
}

/**
 * Parses user input into minor units. Tolerates grouping separators and
 * whitespace; returns `null` for anything it cannot read as a number.
 */
export function parseMoneyInput(raw: string, decimals: number): number | null {
  const cleaned = raw.replace(/[\s,  ]/g, '')
  if (cleaned === '') return null
  const value = Number(cleaned)
  if (!Number.isFinite(value) || value < 0) return null
  return Math.round(value * minorFactor(decimals))
}

/**
 * Parses a percentage, clamped to 0–100, or `null` if unreadable.
 *
 * A lone comma is read as a decimal separator, because that is what a Russian
 * or Armenian keyboard produces for "12,5". Percentages never exceed 100, so
 * there is no grouping separator to confuse it with — unlike money, where a
 * comma is stripped as grouping.
 */
export function parsePercentInput(raw: string): number | null {
  const cleaned = raw.replace(/[\s%]/g, '').replace(/^(\d*),(\d*)$/, '$1.$2')
  if (cleaned === '') return null
  const value = Number(cleaned)
  if (!Number.isFinite(value)) return null
  return clampPercent(value)
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  // Two decimals of precision is plenty and avoids float dust in the UI.
  return Math.min(100, Math.max(0, Math.round(value * 100) / 100))
}

/** Trims float dust from a derived percentage for display. */
export function formatPercent(
  value: number | null,
  digits = 2,
  locale?: string,
): string {
  if (value === null) return '—'
  const rounded = Math.round(value * 10 ** digits) / 10 ** digits
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(rounded)}%`
}
