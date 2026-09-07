import { useMemo } from 'react'
import {
  formatAmount,
  formatMoney,
  formatPercent,
} from '../domain/money'
import { formatRelativeTime } from '../domain/time'
import { useLocale, type Translate } from '.'
import { localeTag } from './locales'

export interface Formatters {
  /** Full currency form: "֏1,000,000". */
  money: (minorUnits: number, currency: string, decimals: number) => string
  /** Grouped number, no symbol — for tight spaces and editable fields. */
  amount: (minorUnits: number, decimals: number) => string
  /** "62.5%", or "—" when the share is not knowable yet. */
  percent: (value: number | null, digits?: number) => string
  /** "3 minutes ago", in the active language. */
  relativeTime: (iso: string) => string
}

/**
 * The domain formatters, bound to the language the user picked.
 *
 * They take an explicit locale tag rather than reading a global, so the domain
 * stays pure and directly testable; this hook is the single place that knows
 * which tag is current.
 */
export function useFormat(t: Translate): Formatters {
  const locale = useLocale()

  return useMemo(() => {
    const tag = localeTag(locale)
    const labels = { justNow: t('time.justNow'), never: t('time.never') }

    return {
      money: (minorUnits, currency, decimals) =>
        formatMoney(minorUnits, currency, decimals, tag),
      amount: (minorUnits, decimals) => formatAmount(minorUnits, decimals, tag),
      percent: (value, digits = 2) => formatPercent(value, digits, tag),
      relativeTime: (iso) =>
        formatRelativeTime(iso, Date.now(), { locale: tag, labels }),
    }
  }, [locale, t])
}
