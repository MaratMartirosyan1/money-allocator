import { partitionGroup } from '../../domain/tree'
import type { AllocNode, AllocationSystem } from '../../domain/types'
import { useT } from '../../i18n'
import { useFormat } from '../../i18n/format'

/**
 * The sibling-group constraint, shown on the parent — which is where the rule
 * actually lives. Percentages are read from the config so the meter is honest
 * before any income is entered; the stranded slice comes from the resolved
 * amounts, because a fixed child's share only exists once there is money.
 */
export function GroupMeter({
  system,
  siblings,
  available,
  stranded,
}: {
  system: AllocationSystem
  siblings: AllocNode[]
  available: number
  stranded: number
}) {
  const t = useT()
  const format = useFormat(t)

  if (siblings.length === 0) return null

  const { fixedKids, autoKids, percentTotal } = partitionGroup(siblings)
  const overcommitted = percentTotal > 100

  const strandedPct =
    available > 0 ? (stranded / available) * 100 : 100 - Math.min(100, percentTotal)
  const claimedPct = Math.max(0, 100 - strandedPct)

  const caption = (() => {
    if (overcommitted) {
      return t('meter.overAllocated', {
        percent: format.percent(percentTotal - 100),
      })
    }
    if (stranded > 0) {
      return t('meter.unallocatedMoney', {
        amount: format.money(stranded, system.currency, system.currencyDecimals),
      })
    }
    if (available === 0 && strandedPct > 0.001) {
      return t('meter.unallocatedPercent', {
        percent: format.percent(strandedPct),
      })
    }
    if (autoKids.length > 0 || fixedKids.length > 0 || percentTotal >= 99.999) {
      return t('meter.full')
    }
    return t('meter.allocated', { percent: format.percent(claimedPct) })
  })()

  const state = overcommitted ? 'is-error' : strandedPct > 0.001 ? 'is-warn' : 'is-ok'

  return (
    <div className={`group-meter ${state}`}>
      <div className="group-meter__track">
        <div
          className="group-meter__fill"
          style={{ width: `${Math.min(100, Math.max(0, claimedPct))}%` }}
        />
      </div>
      <span className="group-meter__caption">
        {t('meter.children', { count: siblings.length })} · {caption}
      </span>
    </div>
  )
}
