import { useEffect, useId, useRef, useState } from 'react'
import { useT } from '../i18n'
import { LocaleToggle } from './LocaleToggle'
import { ThemeToggle } from './ThemeToggle'

function GearIcon() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
      <circle
        cx="8"
        cy="8"
        r="2.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M8 1.2l.9 1.6a5.6 5.6 0 0 1 1.5.6l1.8-.3.9 1.6-1 1.5a5.6 5.6 0 0 1 0 1.6l1 1.5-.9 1.6-1.8-.3a5.6 5.6 0 0 1-1.5.6L8 14.8l-.9-1.6a5.6 5.6 0 0 1-1.5-.6l-1.8.3-.9-1.6 1-1.5a5.6 5.6 0 0 1 0-1.6l-1-1.5.9-1.6 1.8.3a5.6 5.6 0 0 1 1.5-.6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Language and theme, behind one gear.
 *
 * Both are set once and then forgotten, so two permanently visible segmented
 * controls were spending a lot of header — and most of the phone's top bar —
 * on decisions nobody revisits. A single trigger costs one tap to reach them
 * and gives the width back to the diagram name and the income.
 *
 * The popover is deliberately *non-modal*: it darkens nothing and traps
 * nothing, because it holds two three-way choices rather than a task. What it
 * does owe the user is the rest of the contract — Escape closes it and returns
 * focus to the gear, a click anywhere outside dismisses it, and the trigger
 * reports its state through `aria-expanded`.
 */
export function SettingsMenu() {
  const t = useT()
  const [open, setOpen] = useState(false)

  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const panelId = useId()
  const languageLabelId = `${panelId}-language`
  const themeLabelId = `${panelId}-theme`

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      // Escape is a keyboard dismissal, so focus goes back where it came
      // from. An outside *click* deliberately does not steal it back.
      triggerRef.current?.focus()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  // Focus the panel itself on open: it announces the popover's name, and puts
  // the next Tab on the first control inside rather than back out in the bar.
  useEffect(() => {
    if (open) panelRef.current?.focus()
  }, [open])

  return (
    <div className="settings" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="settings__trigger"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={panelId}
        aria-label={t('settings.title')}
        title={t('settings.title')}
        onClick={() => setOpen((current) => !current)}
      >
        <GearIcon />
      </button>

      {open ? (
        <div
          id={panelId}
          ref={panelRef}
          role="dialog"
          aria-label={t('settings.title')}
          className="settings__panel"
          tabIndex={-1}
        >
          <section className="settings__section">
            {/* The visible caption is the group's accessible name, rather
                than a second copy of it — hence `aria-labelledby` on the
                toggle instead of its own `aria-label`. */}
            <span className="settings__label" id={languageLabelId}>
              {t('language.group')}
            </span>
            <LocaleToggle labelledBy={languageLabelId} />
          </section>

          <section className="settings__section">
            <span className="settings__label" id={themeLabelId}>
              {t('theme.group')}
            </span>
            <ThemeToggle labelledBy={themeLabelId} />
          </section>
        </div>
      ) : null}
    </div>
  )
}
