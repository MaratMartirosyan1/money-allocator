/** The three languages the UI ships in. */
export type Locale = 'en' | 'ru' | 'hy'

export interface LocaleInfo {
  code: Locale
  /** BCP 47 tag handed to `Intl.*`. */
  tag: string
  /** The language's own name for itself — never translated. */
  label: string
  /** Two or three characters, for the segmented switcher. */
  short: string
}

export const LOCALES: readonly LocaleInfo[] = [
  { code: 'en', tag: 'en', label: 'English', short: 'EN' },
  { code: 'ru', tag: 'ru', label: 'Русский', short: 'РУ' },
  { code: 'hy', tag: 'hy', label: 'Հայերեն', short: 'ՀԱ' },
]

export const DEFAULT_LOCALE: Locale = 'en'

export function localeTag(locale: Locale): string {
  return LOCALES.find((l) => l.code === locale)?.tag ?? DEFAULT_LOCALE
}

export function isLocale(value: unknown): value is Locale {
  return LOCALES.some((l) => l.code === value)
}

/**
 * First visit: pick from the browser's languages. Matching on the primary
 * subtag only, so `ru-RU`, `hy-AM` and `en-GB` all land somewhere sensible.
 */
export function detectLocale(
  preferred: readonly string[] = typeof navigator === 'undefined'
    ? []
    : (navigator.languages ?? [navigator.language]),
): Locale {
  for (const raw of preferred) {
    const primary = raw?.toLowerCase().split('-')[0]
    const hit = LOCALES.find((l) => l.code === primary)
    if (hit) return hit.code
  }
  return DEFAULT_LOCALE
}
