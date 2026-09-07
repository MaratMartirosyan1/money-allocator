import { useEffect } from 'react'
import { useLocale } from '.'
import { localeTag } from './locales'

/**
 * Reflects the chosen language onto `<html lang>`. Not decoration: it is what
 * tells a screen reader which voice to use, and what lets the browser
 * hyphenate and pick fonts correctly for Armenian and Cyrillic text.
 */
export function useAppliedLocale(): void {
  const locale = useLocale()

  useEffect(() => {
    document.documentElement.lang = localeTag(locale)
  }, [locale])
}
