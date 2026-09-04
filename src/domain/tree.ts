import type { AllocNode, AllocationSystem } from './types'

/** Children in `childIds` order, skipping any dangling ids. */
export function getChildren(
  system: AllocationSystem,
  nodeId: string,
): AllocNode[] {
  const parent = system.nodes[nodeId]
  if (!parent) return []
  const out: AllocNode[] = []
  for (const id of parent.childIds) {
    const child = system.nodes[id]
    if (child) out.push(child)
  }
  return out
}

export interface SiblingGroup {
  percentKids: AllocNode[]
  fixedKids: AllocNode[]
  autoKids: AllocNode[]
  /** Sum of the group's declared percentages — may exceed 100 (a config error). */
  percentTotal: number
}

/**
 * Splits a sibling group by mode. Both the engine and the static validator
 * reason in terms of these three buckets, so the partition lives in one place.
 */
export function partitionGroup(children: AllocNode[]): SiblingGroup {
  const percentKids: AllocNode[] = []
  const fixedKids: AllocNode[] = []
  const autoKids: AllocNode[] = []

  for (const child of children) {
    if (child.mode === 'percent') percentKids.push(child)
    else if (child.mode === 'fixed') fixedKids.push(child)
    else autoKids.push(child)
  }

  const percentTotal = percentKids.reduce(
    (acc, c) => acc + Math.max(0, c.value),
    0,
  )

  return { percentKids, fixedKids, autoKids, percentTotal }
}

/**
 * Pre-order DFS from the root, children in declaration order. Guards against
 * cycles so a corrupted tree degrades instead of hanging.
 */
export function walkTree(
  system: AllocationSystem,
  visit: (node: AllocNode, depth: number) => void,
): void {
  const root = system.nodes[system.rootId]
  if (!root) return

  const seen = new Set<string>()
  const stack: Array<{ node: AllocNode; depth: number }> = [
    { node: root, depth: 0 },
  ]

  while (stack.length > 0) {
    const frame = stack.pop()
    if (!frame) break
    const { node, depth } = frame
    if (seen.has(node.id)) continue
    seen.add(node.id)

    visit(node, depth)

    const children = getChildren(system, node.id)
    // Push in reverse so the first child is processed first.
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i]
      if (child) stack.push({ node: child, depth: depth + 1 })
    }
  }
}

/** Every node beneath `nodeId`, excluding `nodeId` itself. */
export function descendantIds(
  system: AllocationSystem,
  nodeId: string,
): string[] {
  const out: string[] = []
  const seen = new Set<string>([nodeId])
  const stack = [...(system.nodes[nodeId]?.childIds ?? [])]

  while (stack.length > 0) {
    const id = stack.pop()
    if (id === undefined || seen.has(id)) continue
    seen.add(id)
    const node = system.nodes[id]
    if (!node) continue
    out.push(id)
    stack.push(...node.childIds)
  }

  return out
}

/** Root → node, excluding the root. Used to label payout rows. */
export function pathToNode(
  system: AllocationSystem,
  nodeId: string,
): string[] {
  const names: string[] = []
  const seen = new Set<string>()
  let current = system.nodes[nodeId]

  while (current && current.parentId !== null && !seen.has(current.id)) {
    seen.add(current.id)
    names.push(current.name)
    current = system.nodes[current.parentId]
  }

  return names.reverse()
}

export function isLeaf(system: AllocationSystem, nodeId: string): boolean {
  return getChildren(system, nodeId).length === 0
}
