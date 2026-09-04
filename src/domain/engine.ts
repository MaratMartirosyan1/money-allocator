import { largestRemainder, splitEvenly } from './rounding'
import { getChildren, isLeaf, partitionGroup, pathToNode, walkTree } from './tree'
import type {
  AllocationResult,
  AllocationSystem,
  Issue,
  Payout,
} from './types'

/**
 * Resolves an income across the whole tree.
 *
 * Within every sibling group the order is fixed:
 *
 *   1. `percent` children take `available × p / 100` — always a share of the
 *      parent's *full* amount, never of what's left after fixed siblings.
 *      That keeps a node's percentage stable when a fixed sibling changes.
 *   2. `fixed` children take their literal amount out of what percentages
 *      left behind.
 *   3. `auto` children split the remainder, evenly.
 *
 * Everything is integer minor units, apportioned by largest remainder, so the
 * invariant `sum(children) + unallocated === parent` holds exactly at every
 * node — no drams leak, at any depth.
 *
 * Only *runtime* issues are reported here (a fixed amount outrunning the money
 * actually available). Static, income-independent problems come from
 * `validateSystem`; the UI merges the two.
 */
export function computeAllocation(
  system: AllocationSystem,
  income: number,
): AllocationResult {
  const amounts: Record<string, number> = {}
  const percentOfParent: Record<string, number | null> = {}
  const percentOfIncome: Record<string, number | null> = {}
  const unallocated: Record<string, number> = {}
  const issues: Issue[] = []
  const payouts: Payout[] = []

  const root = system.nodes[system.rootId]
  if (!root) {
    return {
      amounts,
      percentOfParent,
      percentOfIncome,
      unallocated,
      issues: [
        {
          nodeId: system.rootId,
          level: 'error',
          code: 'MISSING_ROOT',
          message: 'This system has no root node.',
        },
      ],
      payouts,
    }
  }

  const totalIncome = Math.max(0, Math.round(income))
  amounts[root.id] = totalIncome
  percentOfParent[root.id] = 100
  percentOfIncome[root.id] = 100

  walkTree(system, (node) => {
    const children = getChildren(system, node.id)
    if (children.length === 0) return

    const available = amounts[node.id] ?? 0
    const parentShareOfIncome = percentOfIncome[node.id] ?? null
    const { percentKids, fixedKids, autoKids, percentTotal } =
      partitionGroup(children)

    // ---- 1. percent children -------------------------------------------
    // Clamp defensively: an over-100% group is a config error, but the engine
    // must still never hand out more money than it holds.
    const effectivePercent = Math.min(100, percentTotal)
    if (percentTotal > 100) {
      issues.push({
        nodeId: node.id,
        level: 'error',
        code: 'PERCENT_CLAMPED',
        message: `Children claim ${round2(percentTotal)}% of "${node.name}" — amounts were scaled down to fit 100%.`,
      })
    }

    const percentBudget = Math.round((available * effectivePercent) / 100)
    const percentShares = largestRemainder(
      percentBudget,
      percentKids.map((c) => Math.max(0, c.value)),
    )
    const percentSpent = percentShares.reduce((acc, v) => acc + v, 0)

    // ---- 2. fixed children ---------------------------------------------
    const fixedBudget = Math.max(0, available - percentSpent)
    const requested = fixedKids.map((c) => Math.max(0, Math.round(c.value)))
    const requestedTotal = requested.reduce((acc, v) => acc + v, 0)

    let fixedShares = requested
    if (requestedTotal > fixedBudget) {
      // Scale back proportionally rather than paying the first nodes in full —
      // a shortfall is shared, not dumped on whoever sorts last.
      fixedShares = largestRemainder(fixedBudget, requested)
      issues.push({
        nodeId: node.id,
        level: 'error',
        code: 'FIXED_EXCEEDS_AVAILABLE',
        message: `Fixed amounts under "${node.name}" need more than the ${fixedBudget === 0 ? 'nothing' : 'amount'} available — they were reduced proportionally.`,
      })
    }
    const fixedSpent = fixedShares.reduce((acc, v) => acc + v, 0)

    // ---- 3. auto children ----------------------------------------------
    const remainder = Math.max(0, available - percentSpent - fixedSpent)
    const autoShares =
      autoKids.length > 0 ? splitEvenly(remainder, autoKids.length) : []

    if (autoKids.length === 0 && remainder > 0) {
      unallocated[node.id] = remainder
    }

    // ---- commit ---------------------------------------------------------
    // An `auto` node's share is only knowable up front when no fixed sibling
    // is competing for the same pool; otherwise it depends on the income.
    const autoStaticShare =
      fixedKids.length === 0 && autoKids.length > 0
        ? (100 - effectivePercent) / autoKids.length
        : null

    function commit(id: string, amount: number, ofParent: number | null) {
      amounts[id] = amount
      percentOfParent[id] = ofParent
      percentOfIncome[id] =
        ofParent !== null && parentShareOfIncome !== null
          ? (ofParent * parentShareOfIncome) / 100
          : shareOf(amount, totalIncome)
    }

    percentKids.forEach((child, i) => {
      commit(child.id, percentShares[i] ?? 0, Math.max(0, child.value))
    })
    fixedKids.forEach((child, i) => {
      const amount = fixedShares[i] ?? 0
      commit(child.id, amount, shareOf(amount, available))
    })
    autoKids.forEach((child, i) => {
      const amount = autoShares[i] ?? 0
      commit(child.id, amount, autoStaticShare ?? shareOf(amount, available))
    })
  })

  // Leaves are the accounts that actually receive money.
  walkTree(system, (node) => {
    if (!isLeaf(system, node.id)) return
    const amount = amounts[node.id] ?? 0
    payouts.push({
      nodeId: node.id,
      name: node.name,
      amount,
      path: pathToNode(system, node.id),
    })
    if (totalIncome > 0 && amount === 0) {
      issues.push({
        nodeId: node.id,
        level: 'warning',
        code: 'ZERO_ALLOCATION',
        message: `"${node.name}" receives nothing this month.`,
      })
    }
  })

  return { amounts, percentOfParent, percentOfIncome, unallocated, issues, payouts }
}

/** Percentage `amount` represents of `total`, or `null` if there is no total. */
function shareOf(amount: number, total: number): number | null {
  if (total <= 0) return null
  return (amount / total) * 100
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Total money accounted for. Should always equal the income — the tests assert
 * it, and `PayoutSummary` shows it so a mismatch can never hide.
 */
export function totalAccountedFor(result: AllocationResult): number {
  const paid = result.payouts.reduce((acc, p) => acc + p.amount, 0)
  const stranded = Object.values(result.unallocated).reduce(
    (acc, v) => acc + v,
    0,
  )
  return paid + stranded
}
