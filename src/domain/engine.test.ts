import { describe, expect, it } from 'vitest'
import { computeAllocation, totalAccountedFor } from './engine'
import { createNode, emptySystem } from './factory'
import { largestRemainder, splitEvenly } from './rounding'
import { walkTree } from './tree'
import type { AllocNode, AllocationSystem, Mode } from './types'

/** Builds a system from a terse spec so tests read like the diagrams. */
interface Spec {
  name: string
  mode?: Mode
  value?: number
  children?: Spec[]
}

function build(children: Spec[]): {
  system: AllocationSystem
  id: (name: string) => string
} {
  const system = emptySystem('test')
  const byName = new Map<string, string>([['root', system.rootId]])

  const attach = (parentId: string, specs: Spec[]) => {
    const parent = system.nodes[parentId]
    if (!parent) throw new Error(`missing parent ${parentId}`)
    for (const spec of specs) {
      const node: AllocNode = createNode(parentId, {
        name: spec.name,
        mode: spec.mode ?? 'percent',
        value: spec.value ?? 0,
      })
      system.nodes[node.id] = node
      parent.childIds.push(node.id)
      byName.set(spec.name, node.id)
      if (spec.children) attach(node.id, spec.children)
    }
  }

  attach(system.rootId, children)

  return {
    system,
    id: (name: string) => {
      const found = byName.get(name)
      if (!found) throw new Error(`no node named ${name}`)
      return found
    },
  }
}

/**
 * The invariant that keeps money from leaking: every parent's amount is fully
 * accounted for by its children plus whatever was left stranded.
 */
function expectConservation(system: AllocationSystem, income: number) {
  const result = computeAllocation(system, income)
  walkTree(system, (node) => {
    const children = node.childIds
      .map((id) => system.nodes[id])
      .filter((n): n is AllocNode => Boolean(n))
    if (children.length === 0) return
    const childSum = children.reduce(
      (acc, c) => acc + (result.amounts[c.id] ?? 0),
      0,
    )
    const stranded = result.unallocated[node.id] ?? 0
    expect(childSum + stranded).toBe(result.amounts[node.id] ?? 0)
  })
  expect(totalAccountedFor(result)).toBe(Math.max(0, Math.round(income)))
  return result
}

describe('largestRemainder', () => {
  it('sums to exactly the total', () => {
    expect(largestRemainder(100_000, [33.33, 33.33, 33.34])).toEqual([
      33_330, 33_330, 33_340,
    ])
  })

  it('hands leftover units to the largest remainders, ties by order', () => {
    const parts = splitEvenly(10, 3)
    expect(parts).toEqual([4, 3, 3])
    expect(parts.reduce((a, b) => a + b, 0)).toBe(10)
  })

  it('degrades safely on empty, zero and negative input', () => {
    expect(largestRemainder(100, [])).toEqual([])
    expect(largestRemainder(0, [1, 1])).toEqual([0, 0])
    expect(largestRemainder(100, [0, 0])).toEqual([0, 0])
    expect(largestRemainder(-5, [1, 1])).toEqual([0, 0])
  })

  it('never loses a unit across many awkward splits', () => {
    for (let total = 0; total < 200; total++) {
      for (let n = 1; n <= 7; n++) {
        const parts = splitEvenly(total, n)
        expect(parts.reduce((a, b) => a + b, 0)).toBe(total)
      }
    }
  })
})

describe('percentage groups', () => {
  it('splits 10 / 10 / auto of 1,000,000 and derives 80% for the auto node', () => {
    const { system, id } = build([
      { name: 'Charity', mode: 'percent', value: 10 },
      { name: 'Savings', mode: 'percent', value: 10 },
      { name: 'Living', mode: 'auto' },
    ])

    const result = expectConservation(system, 1_000_000)

    expect(result.amounts[id('Charity')]).toBe(100_000)
    expect(result.amounts[id('Savings')]).toBe(100_000)
    expect(result.amounts[id('Living')]).toBe(800_000)
    expect(result.percentOfParent[id('Living')]).toBe(80)
  })

  it('knows the auto share before any income is entered', () => {
    const { system, id } = build([
      { name: 'Charity', mode: 'percent', value: 10 },
      { name: 'Savings', mode: 'percent', value: 10 },
      { name: 'Living', mode: 'auto' },
    ])

    const result = computeAllocation(system, 0)

    expect(result.percentOfParent[id('Living')]).toBe(80)
    expect(result.percentOfIncome[id('Living')]).toBe(80)
    expect(result.amounts[id('Living')]).toBe(0)
  })

  it('strands the remainder when no auto child claims it', () => {
    const { system, id } = build([
      { name: 'Charity', mode: 'percent', value: 10 },
      { name: 'Savings', mode: 'percent', value: 10 },
    ])

    const result = expectConservation(system, 1_000_000)

    expect(result.unallocated[system.rootId]).toBe(800_000)
    expect(result.amounts[id('Charity')]).toBe(100_000)
  })

  it('splits the remainder evenly between several auto children', () => {
    const { system, id } = build([
      { name: 'Fixed slice', mode: 'percent', value: 40 },
      { name: 'A', mode: 'auto' },
      { name: 'B', mode: 'auto' },
    ])

    const result = expectConservation(system, 1_000_000)

    expect(result.amounts[id('A')]).toBe(300_000)
    expect(result.amounts[id('B')]).toBe(300_000)
    expect(result.percentOfParent[id('A')]).toBe(30)
  })

  it('scales percentages down instead of overspending when a group exceeds 100%', () => {
    const { system, id } = build([
      { name: 'A', mode: 'percent', value: 70 },
      { name: 'B', mode: 'percent', value: 70 },
    ])

    const result = expectConservation(system, 1_000_000)

    expect(result.amounts[id('A')]).toBe(500_000)
    expect(result.amounts[id('B')]).toBe(500_000)
    expect(result.issues.some((i) => i.code === 'PERCENT_CLAMPED')).toBe(true)
  })

  it('keeps exact totals on repeating percentages', () => {
    const { system, id } = build([
      { name: 'A', mode: 'percent', value: 33.33 },
      { name: 'B', mode: 'percent', value: 33.33 },
      { name: 'C', mode: 'percent', value: 33.34 },
    ])

    const result = expectConservation(system, 100_000)

    expect(result.amounts[id('A')]).toBe(33_330)
    expect(result.amounts[id('B')]).toBe(33_330)
    expect(result.amounts[id('C')]).toBe(33_340)
  })
})

describe('fixed amounts', () => {
  /** The scenario from the original brief, in full. */
  function brief() {
    return build([
      { name: 'Charity', mode: 'percent', value: 10 },
      { name: 'Savings', mode: 'percent', value: 10 },
      {
        name: 'Living',
        mode: 'auto',
        children: [
          { name: 'Rent', mode: 'fixed', value: 300_000 },
          { name: 'Spendings', mode: 'auto' },
        ],
      },
    ])
  }

  it('pays a fixed child first and leaves the rest to the auto sibling', () => {
    const { system, id } = brief()

    const result = expectConservation(system, 1_000_000)

    expect(result.amounts[id('Living')]).toBe(800_000)
    expect(result.amounts[id('Rent')]).toBe(300_000)
    expect(result.amounts[id('Spendings')]).toBe(500_000)
    expect(result.percentOfParent[id('Spendings')]).toBe(62.5)
    expect(result.percentOfIncome[id('Spendings')]).toBe(50)
  })

  it('shrinks the auto sibling as the income falls', () => {
    const { system, id } = brief()

    const result = expectConservation(system, 400_000)

    expect(result.amounts[id('Living')]).toBe(320_000)
    expect(result.amounts[id('Rent')]).toBe(300_000)
    expect(result.amounts[id('Spendings')]).toBe(20_000)
  })

  it('clamps a fixed amount that outruns the money available', () => {
    const { system, id } = brief()

    const result = expectConservation(system, 200_000)

    expect(result.amounts[id('Living')]).toBe(160_000)
    expect(result.amounts[id('Rent')]).toBe(160_000)
    expect(result.amounts[id('Spendings')]).toBe(0)
    expect(
      result.issues.some((i) => i.code === 'FIXED_EXCEEDS_AVAILABLE'),
    ).toBe(true)
  })

  it('shares a shortfall proportionally between fixed siblings', () => {
    const { system, id } = build([
      { name: 'A', mode: 'fixed', value: 300_000 },
      { name: 'B', mode: 'fixed', value: 100_000 },
    ])

    const result = expectConservation(system, 200_000)

    expect(result.amounts[id('A')]).toBe(150_000)
    expect(result.amounts[id('B')]).toBe(50_000)
  })

  it('reports no fixed percentage until an income is known', () => {
    const { system, id } = brief()

    const result = computeAllocation(system, 0)

    expect(result.percentOfParent[id('Spendings')]).toBeNull()
    expect(result.percentOfParent[id('Rent')]).toBeNull()
    // Pure-percentage siblings are still knowable.
    expect(result.percentOfParent[id('Charity')]).toBe(10)
  })

  it('takes percentages from the parent total, not from what fixed left over', () => {
    const { system, id } = build([
      { name: 'Tithe', mode: 'percent', value: 10 },
      { name: 'Rent', mode: 'fixed', value: 300_000 },
      { name: 'Rest', mode: 'auto' },
    ])

    const result = expectConservation(system, 1_000_000)

    expect(result.amounts[id('Tithe')]).toBe(100_000)
    expect(result.amounts[id('Rent')]).toBe(300_000)
    expect(result.amounts[id('Rest')]).toBe(600_000)
  })
})

describe('edge cases', () => {
  it('returns all zeros for a zero income', () => {
    const { system, id } = build([
      { name: 'A', mode: 'percent', value: 50 },
      { name: 'B', mode: 'auto' },
    ])

    const result = expectConservation(system, 0)

    expect(result.amounts[id('A')]).toBe(0)
    expect(result.amounts[id('B')]).toBe(0)
    expect(result.issues.filter((i) => i.code === 'ZERO_ALLOCATION')).toHaveLength(0)
  })

  it('treats a negative income as zero', () => {
    const { system } = build([{ name: 'A', mode: 'auto' }])
    const result = expectConservation(system, -5_000)
    expect(result.amounts[system.rootId]).toBe(0)
  })

  it('holds conservation through deep nesting', () => {
    const { system } = build([
      {
        name: 'L1a',
        mode: 'percent',
        value: 33.33,
        children: [
          {
            name: 'L2a',
            mode: 'percent',
            value: 33.33,
            children: [
              { name: 'L3a', mode: 'fixed', value: 7_777 },
              { name: 'L3b', mode: 'auto' },
              { name: 'L3c', mode: 'auto' },
            ],
          },
          { name: 'L2b', mode: 'auto' },
        ],
      },
      { name: 'L1b', mode: 'fixed', value: 123_457 },
      { name: 'L1c', mode: 'auto' },
    ])

    for (const income of [0, 1, 999, 100_001, 333_333, 1_000_000, 7_777_777]) {
      expectConservation(system, income)
    }
  })

  it('lists every leaf as a payout with its path', () => {
    const { system, id } = build([
      { name: 'Charity', mode: 'percent', value: 10 },
      {
        name: 'Living',
        mode: 'auto',
        children: [{ name: 'Rent', mode: 'auto' }],
      },
    ])

    const result = computeAllocation(system, 1_000_000)

    expect(result.payouts.map((p) => p.name)).toEqual(['Charity', 'Rent'])
    expect(result.payouts.find((p) => p.nodeId === id('Rent'))?.path).toEqual([
      'Living',
      'Rent',
    ])
  })

  it('warns about a leaf that receives nothing', () => {
    const { system, id } = build([
      { name: 'All of it', mode: 'percent', value: 100 },
      { name: 'Nothing', mode: 'auto' },
    ])

    const result = computeAllocation(system, 1_000_000)

    expect(
      result.issues.some(
        (i) => i.code === 'ZERO_ALLOCATION' && i.nodeId === id('Nothing'),
      ),
    ).toBe(true)
  })

  it('survives a missing root', () => {
    const system = emptySystem()
    system.rootId = 'nope'
    const result = computeAllocation(system, 1_000)
    expect(result.issues[0]?.code).toBe('MISSING_ROOT')
  })

  it('does not hang on a cycle', () => {
    const { system, id } = build([
      { name: 'A', mode: 'auto', children: [{ name: 'B', mode: 'auto' }] },
    ])
    const b = system.nodes[id('B')]
    if (b) b.childIds = [id('A')]

    const result = computeAllocation(system, 1_000)
    expect(result.amounts[id('A')]).toBe(1_000)
  })
})
