import { useEffect, useRef, useState } from 'react'
import { parseMoneyInput, parsePercentInput } from '../../domain/money'
import type { Mode } from '../../domain/types'
import { useT } from '../../i18n'
import { useFormat } from '../../i18n/format'

/**
 * The editable value of a node. Percentages are clamped to the group's
 * remaining headroom as they are typed — if the clamp bites, the field snaps
 * back to the allowed number so what is on screen is always what is stored.
 */
export function ValueField({
  mode,
  value,
  headroom,
  currency,
  decimals,
  onCommit,
}: {
  mode: Exclude<Mode, 'auto'>
  value: number
  /** Percentage points still free in the sibling group. */
  headroom: number
  currency: string
  decimals: number
  onCommit: (value: number) => void
}) {
  const t = useT()
  const format = useFormat(t)
  const isPercent = mode === 'percent'
  const formatValue = (v: number) =>
    isPercent ? String(v) : format.amount(v, decimals)

  const [text, setText] = useState(() => formatValue(value))
  const focused = useRef(false)

  // Re-sync when the value changes from elsewhere (mode switch, undo, reset)
  // but never while the user is mid-edit in this field.
  useEffect(() => {
    if (!focused.current) setText(formatValue(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, mode, decimals, format])

  const handleChange = (raw: string) => {
    if (raw.trim() === '') {
      setText('')
      onCommit(0)
      return
    }

    const parsed = isPercent ? parsePercentInput(raw) : parseMoneyInput(raw, decimals)
    if (parsed === null) return

    if (isPercent && parsed > headroom) {
      setText(String(headroom))
      onCommit(headroom)
      return
    }

    setText(raw)
    onCommit(parsed)
  }

  return (
    <label className="value-field">
      <span className="value-field__label">
        {isPercent ? t('value.share') : t('value.amount')}
        {isPercent && headroom < 100 ? (
          <em title={t('value.freeTitle')}>
            {t('value.free', { count: headroom })}
          </em>
        ) : null}
      </span>
      <span className="value-field__control">
        <input
          className="nodrag nowheel"
          type="text"
          inputMode="decimal"
          value={text}
          aria-label={isPercent ? t('value.percentLabel') : t('value.fixedLabel')}
          onFocus={() => {
            focused.current = true
          }}
          onBlur={() => {
            focused.current = false
            setText(formatValue(value))
          }}
          onChange={(e) => handleChange(e.target.value)}
        />
        <span className="value-field__unit">{isPercent ? '%' : currency}</span>
      </span>
    </label>
  )
}
