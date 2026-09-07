import { LOCALES } from '../i18n/locales'
import { useAllocatorStore } from '../store/useAllocatorStore'

/**
 * Language picker. Each option is labelled in its own language — someone who
 * has landed on the wrong one cannot read the others.
 */
export function LocaleToggle({ labelledBy }: { labelledBy: string }) {
  const locale = useAllocatorStore((s) => s.locale)
  const setLocale = useAllocatorStore((s) => s.setLocale)

  return (
    <div className="locale-toggle" role="group" aria-labelledby={labelledBy}>
      {LOCALES.map((option) => (
        <button
          key={option.code}
          type="button"
          lang={option.tag}
          title={option.label}
          aria-label={option.label}
          aria-pressed={locale === option.code}
          className={locale === option.code ? 'is-active' : ''}
          onClick={() => setLocale(option.code)}
        >
          {option.short}
        </button>
      ))}
    </div>
  )
}
