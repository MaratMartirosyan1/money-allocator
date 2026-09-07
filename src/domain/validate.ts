import { getChildren, partitionGroup, walkTree } from './tree'
import type { AllocationSystem, Issue } from './types'

/**
 * Income-independent checks — everything that can be judged from the shape of
 * the tree alone.
 *
 * The line between this and the engine's runtime issues matters: a percentage
 * group summing over 100 is *always* broken, whereas a fixed amount is only
 * too large relative to a particular income. Config errors belong here so the
 * editor can flag them before any income is entered.
 */
export function validateSystem(system: AllocationSystem): Issue[] {
  const issues: Issue[] = []

  const root = system.nodes[system.rootId]
  if (!root) {
    issues.push({
      nodeId: system.rootId,
      level: 'error',
      code: 'MISSING_ROOT',
      params: {},
    })
    return issues
  }

  const reachable = new Set<string>()
  walkTree(system, (node) => {
    reachable.add(node.id)
    const children = getChildren(system, node.id)
    if (children.length === 0) return

    const { percentKids, fixedKids, autoKids, percentTotal } =
      partitionGroup(children)

    if (percentTotal > 100) {
      issues.push({
        nodeId: node.id,
        level: 'error',
        code: 'PERCENT_SUM_EXCEEDS_100',
        params: { name: node.name, percent: round2(percentTotal) },
      })
    }

    if (autoKids.length > 1) {
      issues.push({
        nodeId: node.id,
        level: 'warning',
        code: 'MULTIPLE_AUTO_SIBLINGS',
        params: { name: node.name, count: autoKids.length },
      })
    }

    if (autoKids.length === 0) {
      if (fixedKids.length > 0) {
        issues.push({
          nodeId: node.id,
          level: 'warning',
          code: 'FIXED_WITHOUT_AUTO_SIBLING',
          params: { name: node.name },
        })
      } else if (percentTotal < 100) {
        issues.push({
          nodeId: node.id,
          level: 'warning',
          code: 'UNALLOCATED_REMAINDER',
          params: {
            name: node.name,
            percent: round2(percentTotal),
            remainder: round2(100 - percentTotal),
          },
        })
      }
    }

    // Per-child value sanity.
    for (const child of percentKids) {
      if (!Number.isFinite(child.value) || child.value < 0 || child.value > 100) {
        issues.push({
          nodeId: child.id,
          level: 'error',
          code: 'INVALID_PERCENT',
          params: { name: child.name },
        })
      }
    }
    for (const child of fixedKids) {
      if (!Number.isFinite(child.value) || child.value < 0) {
        issues.push({
          nodeId: child.id,
          level: 'error',
          code: 'INVALID_FIXED',
          params: { name: child.name },
        })
      }
    }

    // Duplicate names are legal but make the payout table ambiguous.
    const seenNames = new Map<string, string>()
    for (const child of children) {
      const key = child.name.trim().toLowerCase()
      if (key === '') continue
      const first = seenNames.get(key)
      if (first !== undefined) {
        issues.push({
          nodeId: child.id,
          level: 'warning',
          code: 'DUPLICATE_SIBLING_NAME',
          params: { name: node.name, otherName: child.name },
        })
      } else {
        seenNames.set(key, child.id)
      }
    }
  })

  // Anything the walk could not reach is orphaned or caught in a cycle.
  const orphans = Object.keys(system.nodes).filter((id) => !reachable.has(id))
  if (orphans.length > 0) {
    issues.push({
      nodeId: orphans[0] ?? system.rootId,
      level: 'error',
      code: 'BROKEN_TREE',
      params: { count: orphans.length },
    })
  }

  return issues
}

/**
 * Headroom left in a sibling group, for clamping percentage inputs as they are
 * typed. `excludeId` leaves the node being edited out of the sum.
 */
export function percentHeadroom(
  system: AllocationSystem,
  parentId: string,
  excludeId?: string,
): number {
  const siblings = getChildren(system, parentId).filter(
    (c) => c.mode === 'percent' && c.id !== excludeId,
  )
  const used = siblings.reduce((acc, c) => acc + Math.max(0, c.value), 0)
  return Math.max(0, Math.round((100 - used) * 100) / 100)
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
