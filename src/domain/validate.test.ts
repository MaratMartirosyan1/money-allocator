import { describe, expect, it } from 'vitest'
import { createNode, emptySystem, starterSystem } from './factory'
import { percentHeadroom, validateSystem } from './validate'
import type { AllocNode, AllocationSystem, Mode } from './types'

function withChildren(
  specs: Array<{ name: string; mode?: Mode; value?: number }>,
): { system: AllocationSystem; ids: Record<string, string> } {
  const system = emptySystem('test')
  const root = system.nodes[system.rootId]
  if (!root) throw new Error('no root')
  const ids: Record<string, string> = {}

  for (const spec of specs) {
    const node: AllocNode = createNode(system.rootId, {
      name: spec.name,
      mode: spec.mode ?? 'percent',
      value: spec.value ?? 0,
    })
    system.nodes[node.id] = node
    root.childIds.push(node.id)
    ids[spec.name] = node.id
  }

  return { system, ids }
}

function codes(system: AllocationSystem): string[] {
  return validateSystem(system).map((i) => i.code)
}

describe('validateSystem', () => {
  it('passes a well-formed starter system', () => {
    expect(validateSystem(starterSystem())).toEqual([])
  })

  it('rejects siblings summing over 100%', () => {
    const { system } = withChildren([
      { name: 'A', value: 70 },
      { name: 'B', value: 70 },
    ])
    expect(codes(system)).toContain('PERCENT_SUM_EXCEEDS_100')
  })

  it('warns when percentages fall short and nothing absorbs the rest', () => {
    const { system } = withChildren([
      { name: 'A', value: 10 },
      { name: 'B', value: 10 },
    ])
    expect(codes(system)).toContain('UNALLOCATED_REMAINDER')
  })

  it('stays quiet when an auto child absorbs the shortfall', () => {
    const { system } = withChildren([
      { name: 'A', value: 10 },
      { name: 'B', mode: 'auto' },
    ])
    expect(codes(system)).not.toContain('UNALLOCATED_REMAINDER')
  })

  it('warns about a fixed child with no auto sibling', () => {
    const { system } = withChildren([
      { name: 'Rent', mode: 'fixed', value: 300_000 },
    ])
    expect(codes(system)).toContain('FIXED_WITHOUT_AUTO_SIBLING')
  })

  it('warns about more than one auto sibling', () => {
    const { system } = withChildren([
      { name: 'A', mode: 'auto' },
      { name: 'B', mode: 'auto' },
    ])
    expect(codes(system)).toContain('MULTIPLE_AUTO_SIBLINGS')
  })

  it('does not treat a fixed amount as a config error, however large', () => {
    const { system } = withChildren([
      { name: 'Rent', mode: 'fixed', value: 999_999_999 },
      { name: 'Rest', mode: 'auto' },
    ])
    // Only an income can decide whether this is too much.
    expect(codes(system)).toEqual([])
  })

  it('flags duplicate sibling names', () => {
    const { system } = withChildren([
      { name: 'Rent', value: 10 },
      { name: 'rent ', value: 10 },
      { name: 'Rest', mode: 'auto' },
    ])
    expect(codes(system)).toContain('DUPLICATE_SIBLING_NAME')
  })

  it('flags out-of-range values', () => {
    const { system } = withChildren([
      { name: 'A', value: 150 },
      { name: 'B', mode: 'fixed', value: -1 },
    ])
    const found = codes(system)
    expect(found).toContain('INVALID_PERCENT')
    expect(found).toContain('INVALID_FIXED')
  })

  it('detects nodes unreachable from the root', () => {
    const { system } = withChildren([{ name: 'A', mode: 'auto' }])
    const orphan = createNode('ghost', { name: 'Orphan' })
    system.nodes[orphan.id] = orphan
    expect(codes(system)).toContain('BROKEN_TREE')
  })
})

describe('percentHeadroom', () => {
  it('reports what is left for a new percentage child', () => {
    const { system } = withChildren([
      { name: 'A', value: 10 },
      { name: 'B', value: 25 },
      { name: 'C', mode: 'auto' },
    ])
    expect(percentHeadroom(system, system.rootId)).toBe(65)
  })

  it('excludes the node being edited', () => {
    const { system, ids } = withChildren([
      { name: 'A', value: 10 },
      { name: 'B', value: 25 },
    ])
    expect(percentHeadroom(system, system.rootId, ids['B'])).toBe(90)
  })

  it('never goes negative', () => {
    const { system } = withChildren([
      { name: 'A', value: 80 },
      { name: 'B', value: 80 },
    ])
    expect(percentHeadroom(system, system.rootId)).toBe(0)
  })
})
