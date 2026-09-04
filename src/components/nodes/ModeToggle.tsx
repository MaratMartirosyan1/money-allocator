import type { Mode } from '../../domain/types'

const OPTIONS: Array<{ mode: Mode; label: string; title: string }> = [
  { mode: 'percent', label: '%', title: 'A percentage of the parent amount' },
  { mode: 'fixed', label: 'Fixed', title: 'A fixed amount, taken off the top' },
  { mode: 'auto', label: 'Auto', title: 'Takes whatever the siblings leave over' },
]

export function ModeToggle({
  value,
  onChange,
}: {
  value: Mode
  onChange: (mode: Mode) => void
}) {
  return (
    <div className="mode-toggle nodrag" role="group" aria-label="Allocation mode">
      {OPTIONS.map((option) => (
        <button
          key={option.mode}
          type="button"
          title={option.title}
          aria-pressed={value === option.mode}
          className={value === option.mode ? 'is-active' : ''}
          onClick={() => onChange(option.mode)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
