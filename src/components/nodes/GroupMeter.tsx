import { formatMoney, formatPercent } from '../../domain/money'
import { partitionGroup } from '../../domain/tree'
import type { AllocNode, AllocationSystem } from '../../domain/types'

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
  if (siblings.length === 0) return null

  const { fixedKids, autoKids, percentTotal } = partitionGroup(siblings)
  const overcommitted = percentTotal > 100

  const strandedPct =
    available > 0 ? (stranded / available) * 100 : 100 - Math.min(100, percentTotal)
  const claimedPct = Math.max(0, 100 - strandedPct)

  const caption = (() => {
    if (overcommitted) {
      return `Over-allocated by ${formatPercent(percentTotal - 100)}`
    }
    if (stranded > 0) {
      return `${formatMoney(stranded, system.currency, system.currencyDecimals)} unallocated`
    }
    if (available === 0 && strandedPct > 0.001) {
      return `${formatPercent(strandedPct)} unallocated`
    }
    if (autoKids.length > 0 || fixedKids.length > 0 || percentTotal >= 99.999) {
      return 'Fully allocated'
    }
    return `${formatPercent(claimedPct)} allocated`
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
        {siblings.length} {siblings.length === 1 ? 'child' : 'children'} ·{' '}
        {caption}
      </span>
    </div>
  )
}
