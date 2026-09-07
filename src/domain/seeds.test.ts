import { describe, expect, it } from 'vitest'
import { emptySystem } from './factory'
import { SEED_IDS, SEED_VERSION, applySeeds } from './seeds'
import { SEED_SYSTEMS } from './seeds.data'
import { computeAllocation } from './engine'
import { validateSystem } from './validate'
import { getChildren, walkTree } from './tree'
import type { AllocationSystem } from './types'

/** A state with only the user's own diagrams in it. */
function stateWith(...systems: AllocationSystem[]) {
  return {
    systems: Object.fromEntries(systems.map((s) => [s.id, s])),
    systemOrder: systems.map((s) => s.id),
    activeSystemId: systems[0]?.id ?? '',
    seedVersion: 0,
  }
}

describe('the seed data', () => {
  it('ships at least one diagram', () => {
    expect(SEED_SYSTEMS.length).toBeGreaterThan(0)
  })

  it('gives every seed a distinct id', () => {
    expect(new Set(SEED_IDS).size).toBe(SEED_SYSTEMS.length)
  })

  it('is a well-formed tree the engine can walk', () => {
    for (const system of SEED_SYSTEMS) {
      expect(system.nodes[system.rootId]).toBeDefined()

      const reachable = new Set<string>()
      walkTree(system, (node) => {
        reachable.add(node.id)
        for (const child of getChildren(system, node.id)) {
          expect(child.parentId).toBe(node.id)
        }
      })
      // Every node reachable means no orphans and no cycles.
      expect(reachable.size).toBe(Object.keys(system.nodes).length)
    }
  })

  it('has no configuration errors', () => {
    for (const system of SEED_SYSTEMS) {
      const errors = validateSystem(system).filter((i) => i.level === 'error')
      expect([system.name, errors]).toEqual([system.name, []])
    }
  })

  it('conserves money at every node', () => {
    for (const system of SEED_SYSTEMS) {
      const result = computeAllocation(system, 1_000_000)
      walkTree(system, (node) => {
        const children = getChildren(system, node.id)
        if (children.length === 0) return
        const paid = children.reduce(
          (acc, c) => acc + (result.amounts[c.id] ?? 0),
          0,
        )
        const stranded = result.unallocated[node.id] ?? 0
        expect([node.name, paid + stranded]).toEqual([
          node.name,
          result.amounts[node.id] ?? 0,
        ])
      })
    }
  })
})

describe('applySeeds', () => {
  it('installs every seed into an empty-ish state', () => {
    const mine = emptySystem('Mine')
    const next = applySeeds(stateWith(mine))

    for (const id of SEED_IDS) expect(next.systems[id]).toBeDefined()
    expect(next.seedVersion).toBe(SEED_VERSION)
  })

  it('puts newly installed seeds ahead of the user\'s diagrams', () => {
    const mine = emptySystem('Mine')
    const next = applySeeds(stateWith(mine))

    expect(next.systemOrder.slice(0, SEED_IDS.length)).toEqual([...SEED_IDS])
    expect(next.systemOrder.at(-1)).toBe(mine.id)
  })

  it('is idempotent — the second boot adds nothing', () => {
    const once = applySeeds(stateWith(emptySystem('Mine')))
    const twice = applySeeds(once)

    expect(twice.systemOrder).toEqual(once.systemOrder)
    expect(Object.keys(twice.systems).sort()).toEqual(
      Object.keys(once.systems).sort(),
    )
  })

  it('never touches a diagram the user made', () => {
    const mine = emptySystem('Mine')
    mine.name = 'My own budget'
    const next = applySeeds(stateWith(mine))

    expect(next.systems[mine.id]).toBe(mine)
  })

  it('leaves an already-installed seed alone at the same version', () => {
    const seeded = applySeeds(stateWith(emptySystem('Mine')))
    const seedId = SEED_IDS[0] ?? ''

    // The user renames a seeded diagram; a same-version boot must respect it.
    const edited = {
      ...seeded,
      systems: {
        ...seeded.systems,
        [seedId]: { ...seeded.systems[seedId]!, name: 'Renamed by me' },
      },
    }

    expect(applySeeds(edited).systems[seedId]?.name).toBe('Renamed by me')
  })

  it('rewrites the seeds when the stored version is behind', () => {
    const seeded = applySeeds(stateWith(emptySystem('Mine')))
    const seedId = SEED_IDS[0] ?? ''

    const stale = {
      ...seeded,
      seedVersion: SEED_VERSION - 1,
      systems: {
        ...seeded.systems,
        [seedId]: { ...seeded.systems[seedId]!, name: 'Stale copy' },
      },
    }

    const next = applySeeds(stale)
    expect(next.systems[seedId]?.name).toBe(SEED_SYSTEMS[0]?.name)
    expect(next.seedVersion).toBe(SEED_VERSION)
  })

  it('brings a deleted seed back on the next boot', () => {
    // The documented consequence of "always ensure present". If this ever has
    // to change, it changes here.
    const seeded = applySeeds(stateWith(emptySystem('Mine')))
    const seedId = SEED_IDS[0] ?? ''

    const systems = { ...seeded.systems }
    delete systems[seedId]
    const afterDelete = {
      ...seeded,
      systems,
      systemOrder: seeded.systemOrder.filter((id) => id !== seedId),
    }

    expect(applySeeds(afterDelete).systems[seedId]).toBeDefined()
  })

  it('hands out private copies, so the store cannot mutate the module data', () => {
    const seedId = SEED_IDS[0] ?? ''
    const a = applySeeds(stateWith(emptySystem('Mine'))).systems[seedId]
    const b = applySeeds(stateWith(emptySystem('Mine'))).systems[seedId]

    expect(a).not.toBe(SEED_SYSTEMS[0])
    expect(a).not.toBe(b)
    expect(a?.nodes).not.toBe(b?.nodes)
    expect(a).toEqual(b)
  })

  it('repoints a dangling activeSystemId at something openable', () => {
    const next = applySeeds({
      systems: {} as Record<string, AllocationSystem>,
      systemOrder: [] as string[],
      activeSystemId: 'gone',
      seedVersion: 0,
    })

    expect(next.systems[next.activeSystemId]).toBeDefined()
  })
})
