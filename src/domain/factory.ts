import type { AllocNode, AllocationSystem, Mode } from './types'

export const ROOT_NAME = 'Monthly income'

export function newId(): string {
  return crypto.randomUUID()
}

export function createNode(
  parentId: string | null,
  overrides: Partial<AllocNode> = {},
): AllocNode {
  return {
    id: newId(),
    name: '',
    parentId,
    childIds: [],
    mode: 'percent',
    value: 0,
    ...overrides,
  }
}

/** Sensible starting value when a node switches mode. */
export function defaultValueFor(mode: Mode, headroom: number): number {
  if (mode === 'percent') return Math.min(10, headroom)
  return 0
}

export function emptySystem(name = 'My allocation'): AllocationSystem {
  const root = createNode(null, { name: ROOT_NAME, mode: 'percent', value: 100 })
  const now = new Date().toISOString()

  return {
    id: newId(),
    name,
    currency: 'AMD',
    currencyDecimals: 0,
    schemaVersion: 1,
    rootId: root.id,
    nodes: { [root.id]: root },
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * The starter system a first-time user lands on: two small percentage slices
 * and an `auto` node soaking up the rest, which is the pattern the whole tool
 * is built around.
 */
export function starterSystem(): AllocationSystem {
  const system = emptySystem('My allocation')
  const rootId = system.rootId

  const charity = createNode(rootId, { name: 'Charity', mode: 'percent', value: 10 })
  const savings = createNode(rootId, { name: 'Savings', mode: 'percent', value: 10 })
  const living = createNode(rootId, { name: 'Living', mode: 'auto', value: 0 })

  for (const node of [charity, savings, living]) {
    system.nodes[node.id] = node
  }
  const root = system.nodes[rootId]
  if (root) root.childIds = [charity.id, savings.id, living.id]

  return system
}
