import { SEED_SYSTEMS } from './seeds.data'
import type { AllocNode, AllocationSystem, NodePosition } from './types'

/**
 * Bump this when `seeds.data.ts` changes and the correction has to reach
 * people who already have the old copy.
 *
 * It is a manual number rather than a hash of the data on purpose: raising it
 * **overwrites the user's own edits to the seeded diagrams**, so that has to
 * be a decision someone makes, not a side effect of reformatting a file.
 */
export const SEED_VERSION = 1

export interface SeedableState {
  systems: Record<string, AllocationSystem>
  systemOrder: string[]
  activeSystemId: string
  seedVersion: number
}

/** A private copy, so the store can never mutate the module-level constant. */
function cloneSystem(source: AllocationSystem): AllocationSystem {
  const nodes: Record<string, AllocNode> = {}
  for (const [id, node] of Object.entries(source.nodes)) {
    nodes[id] = { ...node, childIds: [...node.childIds] }
  }

  const clone: AllocationSystem = { ...source, nodes }

  if (source.positions) {
    const positions: Record<string, NodePosition> = {}
    for (const [id, at] of Object.entries(source.positions)) {
      positions[id] = { ...at }
    }
    clone.positions = positions
  }

  return clone
}

export const SEED_IDS: readonly string[] = SEED_SYSTEMS.map((s) => s.id)

/**
 * Guarantees the seeded diagrams are present in the persisted state.
 *
 * - A seed the user does not have is inserted and put at the front of the
 *   list. Recognition is by fixed id, which is the only reason this can run on
 *   every boot without piling up duplicates.
 * - When the stored `seedVersion` is behind, *all* seeds are rewritten from
 *   the data file — that is what a version bump is for.
 * - Diagrams the user made are never read, written or reordered.
 *
 * Note the consequence of "always ensure present": deleting a seeded diagram
 * does not stick, it returns on the next load. Making deletion permanent means
 * recording the dismissed ids and skipping them below.
 */
export function applySeeds<T extends SeedableState>(state: T): T {
  const stale = (state.seedVersion ?? 0) < SEED_VERSION

  const systems = { ...state.systems }
  const existingOrder = state.systemOrder.filter((id) => id in systems || SEED_IDS.includes(id))
  const missing: string[] = []

  for (const seed of SEED_SYSTEMS) {
    if (!systems[seed.id] || stale) systems[seed.id] = cloneSystem(seed)
    if (!existingOrder.includes(seed.id)) missing.push(seed.id)
  }

  // New seeds go to the front; whatever order the user already had is left
  // alone, so a duplicate does not jump away from the diagram it copied.
  const systemOrder = [...missing, ...existingOrder]

  const activeSystemId = systems[state.activeSystemId]
    ? state.activeSystemId
    : (systemOrder[0] ?? '')

  return { ...state, systems, systemOrder, activeSystemId, seedVersion: SEED_VERSION }
}
