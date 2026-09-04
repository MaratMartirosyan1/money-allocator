import type { ThemeMode } from '../store/useAllocatorStore'
import { useAllocatorStore } from '../store/useAllocatorStore'

function SunIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <circle cx="8" cy="8" r="3.1" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <path d="M8 1v1.8M8 13.2V15M15 8h-1.8M2.8 8H1M12.9 3.1l-1.3 1.3M4.4 11.6l-1.3 1.3M12.9 12.9l-1.3-1.3M4.4 4.4L3.1 3.1" />
      </g>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d="M13.4 9.6A5.8 5.8 0 0 1 6.4 2.6a5.9 5.9 0 1 0 7 7Z"
        fill="currentColor"
      />
    </svg>
  )
}

function AutoIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <rect
        x="1.4"
        y="2.6"
        width="13.2"
        height="9.4"
        rx="1.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path d="M5.4 14.1h5.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

const OPTIONS: Array<{
  mode: ThemeMode
  label: string
  icon: () => React.ReactElement
}> = [
  { mode: 'light', label: 'Light', icon: SunIcon },
  { mode: 'dark', label: 'Dark', icon: MoonIcon },
  { mode: 'system', label: 'Match system', icon: AutoIcon },
]

export function ThemeToggle() {
  const theme = useAllocatorStore((s) => s.theme)
  const setTheme = useAllocatorStore((s) => s.setTheme)

  return (
    <div className="theme-toggle" role="group" aria-label="Theme">
      {OPTIONS.map(({ mode, label, icon: Icon }) => (
        <button
          key={mode}
          type="button"
          title={label}
          aria-label={label}
          aria-pressed={theme === mode}
          className={theme === mode ? 'is-active' : ''}
          onClick={() => setTheme(mode)}
        >
          <Icon />
        </button>
      ))}
    </div>
  )
}
