import { useT } from '../../i18n'
import type { MessageKey } from '../../i18n/en'
import type { Mode } from '../../domain/types'

const OPTIONS: Array<{ mode: Mode; labelKey: MessageKey; titleKey: MessageKey }> = [
  { mode: 'percent', labelKey: 'mode.percent', titleKey: 'mode.percentTitle' },
  { mode: 'fixed', labelKey: 'mode.fixed', titleKey: 'mode.fixedTitle' },
  { mode: 'auto', labelKey: 'mode.auto', titleKey: 'mode.autoTitle' },
]

export function ModeToggle({
  value,
  onChange,
}: {
  value: Mode
  onChange: (mode: Mode) => void
}) {
  const t = useT()

  return (
    <div className="mode-toggle nodrag" role="group" aria-label={t('mode.group')}>
      {OPTIONS.map((option) => (
        <button
          key={option.mode}
          type="button"
          title={t(option.titleKey)}
          aria-pressed={value === option.mode}
          className={value === option.mode ? 'is-active' : ''}
          onClick={() => onChange(option.mode)}
        >
          {t(option.labelKey)}
        </button>
      ))}
    </div>
  )
}
