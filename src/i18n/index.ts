import { useMemo } from 'react'
import { useAllocatorStore } from '../store/useAllocatorStore'
import { en, type Dictionary, type MessageKey, type Message } from './en'
import { hy } from './hy'
import { ru } from './ru'
import { localeTag, type Locale } from './locales'
import { pluralCategory } from './plural'

export type { Locale } from './locales'
export type { MessageKey } from './en'

const DICTIONARIES: Record<Locale, Dictionary> = { en, ru, hy }

export type MessageParams = Record<string, string | number>

const numberFormats = new Map<string, Intl.NumberFormat>()

/** Numbers interpolated into a sentence get the locale's own digits grouping. */
function formatParam(tag: string, value: string | number): string {
  if (typeof value === 'string') return value
  let format = numberFormats.get(tag)
  if (!format) {
    format = new Intl.NumberFormat(tag, { maximumFractionDigits: 2 })
    numberFormats.set(tag, format)
  }
  return format.format(value)
}

function pick(message: Message, tag: string, params?: MessageParams): string {
  if (typeof message === 'string') return message
  const count = Number(params?.count ?? 0)
  const category = pluralCategory(tag, count)
  return message[category] ?? message.other
}

export function translate(
  locale: Locale,
  key: MessageKey,
  params?: MessageParams,
): string {
  const tag = localeTag(locale)
  // English is the source dictionary, so it is also the only sane fallback.
  const message = DICTIONARIES[locale][key] ?? en[key]
  const text = pick(message, tag, params)
  if (!params) return text

  return text.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const value = params[name]
    return value === undefined ? whole : formatParam(tag, value)
  })
}

export type Translate = (key: MessageKey, params?: MessageParams) => string

export function useLocale(): Locale {
  return useAllocatorStore((s) => s.locale)
}

/**
 * `t('checks.absorb')`. Memoized on the locale so a component that only reads
 * `t` does not re-render on every unrelated store write.
 */
export function useT(): Translate {
  const locale = useLocale()
  return useMemo(
    () => (key: MessageKey, params?: MessageParams) =>
      translate(locale, key, params),
    [locale],
  )
}
