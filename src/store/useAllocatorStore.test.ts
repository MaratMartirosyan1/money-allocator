import { beforeEach, describe, expect, it } from 'vitest'
import { getChildren } from '../domain/tree'
import { createInitialState, useAllocatorStore } from './useAllocatorStore'
import { allocationOf } from './selectors'

const get = () => useAllocatorStore.getState()
const activeSystem = () => {
  const s = get()
  const system = s.systems[s.activeSystemId]
  if (!system) throw new Error('no active system')
  return system
}

beforeEach(() => {
  localStorage.clear()
  useAllocatorStore.setState(createInitialState())
  get().setIncome(0)
})

describe('addChild', () => {
  it('makes the first child automatic so it holds the full amount', () => {
    const leaf = getChildren(activeSystem(), activeSystem().rootId)[0]
    if (!leaf) throw new Error('no children')

    const id = get().addChild(leaf.id)
    expect(id).toBeTruthy()

    const child = activeSystem().nodes[id ?? '']
    expect(child?.mode).toBe('auto')
  })

  it('makes later siblings percentages that leave the auto node room', () => {
    const rootId = activeSystem().rootId
    const living = getChildren(activeSystem(), rootId).find(
      (c) => c.mode === 'auto',
    )
    if (!living) throw new Error('no auto child')

    get().addChild(living.id)
    const second = get().addChild(living.id)

    const node = activeSystem().nodes[second ?? '']
    expect(node?.mode).toBe('percent')
    expect(node?.value).toBe(10)
  })

  it('selects the node it just created', () => {
    const id = get().addChild(activeSystem().rootId)
    expect(get().selectedNodeId).toBe(id)
  })
})

describe('removeNode', () => {
  it('cascades to every descendant', () => {
    const rootId = activeSystem().rootId
    const branch = get().addChild(rootId)
    if (!branch) throw new Error('no branch')
    const childA = get().addChild(branch)
    const grandchild = childA ? get().addChild(childA) : null

    const before = Object.keys(activeSystem().nodes).length
    get().removeNode(branch)
    const after = activeSystem().nodes

    expect(Object.keys(after).length).toBe(before - 3)
    expect(after[branch]).toBeUndefined()
    expect(after[childA ?? '']).toBeUndefined()
    expect(after[grandchild ?? '']).toBeUndefined()
  })

  it('unlinks the node from its parent', () => {
    const rootId = activeSystem().rootId
    const id = get().addChild(rootId)
    if (!id) throw new Error('no child')

    get().removeNode(id)
    expect(activeSystem().nodes[rootId]?.childIds).not.toContain(id)
  })

  it('refuses to delete the root', () => {
    const rootId = activeSystem().rootId
    get().removeNode(rootId)
    expect(activeSystem().nodes[rootId]).toBeDefined()
  })

  it('moves the selection to the parent', () => {
    const rootId = activeSystem().rootId
    const id = get().addChild(rootId)
    if (!id) throw new Error('no child')
    get().removeNode(id)
    expect(get().selectedNodeId).toBe(rootId)
  })
})

describe('setMode', () => {
  it('keeps a percentage when staying in percent mode', () => {
    const child = getChildren(activeSystem(), activeSystem().rootId)[0]
    if (!child) throw new Error('no child')

    get().setValue(child.id, 42)
    get().setMode(child.id, 'percent')
    expect(activeSystem().nodes[child.id]?.value).toBe(42)
  })

  it('clears the value when switching to auto', () => {
    const child = getChildren(activeSystem(), activeSystem().rootId)[0]
    if (!child) throw new Error('no child')

    get().setValue(child.id, 42)
    get().setMode(child.id, 'auto')
    expect(activeSystem().nodes[child.id]?.value).toBe(0)
  })

  it('picks a percentage that fits the remaining headroom', () => {
    const rootId = activeSystem().rootId
    const kids = getChildren(activeSystem(), rootId)
    const [first, second, auto] = kids
    if (!first || !second || !auto) throw new Error('unexpected starter shape')

    get().setValue(first.id, 95)
    get().setMode(auto.id, 'percent')
    // 95 + 10 already used, so only headroom is offered.
    expect(activeSystem().nodes[auto.id]?.value).toBeLessThanOrEqual(5)
  })

  it('leaves the root alone', () => {
    const rootId = activeSystem().rootId
    get().setMode(rootId, 'fixed')
    expect(activeSystem().nodes[rootId]?.mode).toBe('percent')
  })
})

describe('moveNode', () => {
  it('re-parents a node', () => {
    const rootId = activeSystem().rootId
    const [a, b] = getChildren(activeSystem(), rootId)
    if (!a || !b) throw new Error('no siblings')

    get().moveNode(a.id, b.id)

    expect(activeSystem().nodes[a.id]?.parentId).toBe(b.id)
    expect(activeSystem().nodes[b.id]?.childIds).toContain(a.id)
    expect(activeSystem().nodes[rootId]?.childIds).not.toContain(a.id)
  })

  it('refuses to move a node inside its own subtree', () => {
    const rootId = activeSystem().rootId
    const parent = get().addChild(rootId)
    const child = parent ? get().addChild(parent) : null
    if (!parent || !child) throw new Error('setup failed')

    get().moveNode(parent, child)
    expect(activeSystem().nodes[parent]?.parentId).toBe(rootId)
  })

  it('refuses to move the root', () => {
    const rootId = activeSystem().rootId
    const child = getChildren(activeSystem(), rootId)[0]
    if (!child) throw new Error('no child')

    get().moveNode(rootId, child.id)
    expect(activeSystem().nodes[rootId]?.parentId).toBeNull()
  })
})

describe('reorderSibling', () => {
  it('moves a node within its group', () => {
    const rootId = activeSystem().rootId
    const before = activeSystem().nodes[rootId]?.childIds ?? []
    const second = before[1]
    if (!second) throw new Error('no second child')

    get().reorderSibling(second, -1)

    expect(activeSystem().nodes[rootId]?.childIds[0]).toBe(second)
  })

  it('ignores a move past the ends', () => {
    const rootId = activeSystem().rootId
    const before = activeSystem().nodes[rootId]?.childIds ?? []
    const first = before[0]
    if (!first) throw new Error('no first child')

    get().reorderSibling(first, -1)
    expect(activeSystem().nodes[rootId]?.childIds).toEqual(before)
  })
})

describe('positions', () => {
  it('stores a dragged position, rounded to whole pixels', () => {
    const child = getChildren(activeSystem(), activeSystem().rootId)[0]
    if (!child) throw new Error('no child')

    get().setNodePosition(child.id, { x: 120.4, y: -60.6 })

    expect(activeSystem().positions?.[child.id]).toEqual({ x: 120, y: -61 })
  })

  it('ignores a position for a node that does not exist', () => {
    get().setNodePosition('ghost', { x: 10, y: 10 })
    expect(activeSystem().positions?.['ghost']).toBeUndefined()
  })

  it('clears every manual position', () => {
    const child = getChildren(activeSystem(), activeSystem().rootId)[0]
    if (!child) throw new Error('no child')

    get().setNodePosition(child.id, { x: 10, y: 10 })
    get().clearPositions()

    expect(activeSystem().positions).toBeUndefined()
  })

  it('drops positions belonging to a deleted subtree', () => {
    const rootId = activeSystem().rootId
    const branch = get().addChild(rootId)
    const leaf = branch ? get().addChild(branch) : null
    if (!branch || !leaf) throw new Error('setup failed')

    get().setNodePosition(branch, { x: 1, y: 1 })
    get().setNodePosition(leaf, { x: 2, y: 2 })
    const survivor = getChildren(activeSystem(), rootId)[0]
    if (!survivor) throw new Error('no survivor')
    get().setNodePosition(survivor.id, { x: 3, y: 3 })

    get().removeNode(branch)

    expect(activeSystem().positions?.[branch]).toBeUndefined()
    expect(activeSystem().positions?.[leaf]).toBeUndefined()
    expect(activeSystem().positions?.[survivor.id]).toEqual({ x: 3, y: 3 })
  })

  it('starts a new diagram with no manual positions', () => {
    const child = getChildren(activeSystem(), activeSystem().rootId)[0]
    if (!child) throw new Error('no child')
    get().setNodePosition(child.id, { x: 5, y: 5 })

    get().createSystem()

    expect(activeSystem().positions).toBeUndefined()
  })
})

describe('immutability', () => {
  it('leaves untouched nodes with their original identity', () => {
    const rootId = activeSystem().rootId
    const [a, b] = getChildren(activeSystem(), rootId)
    if (!a || !b) throw new Error('no siblings')

    const beforeB = activeSystem().nodes[b.id]
    get().renameNode(a.id, 'Renamed')

    expect(activeSystem().nodes[b.id]).toBe(beforeB)
    expect(activeSystem().nodes[a.id]).not.toBe(a)
    expect(activeSystem().nodes[a.id]?.name).toBe('Renamed')
  })

  it('produces a fresh system object so caches invalidate', () => {
    const before = activeSystem()
    get().renameSystem(before.id, 'Next')
    expect(activeSystem()).not.toBe(before)
  })
})

describe('selectors', () => {
  it('returns the identical result object for an unchanged system', () => {
    const system = activeSystem()
    expect(allocationOf(system, 1_000_000)).toBe(allocationOf(system, 1_000_000))
  })

  it('recomputes when the income changes', () => {
    const system = activeSystem()
    const a = allocationOf(system, 1_000_000)
    const b = allocationOf(system, 2_000_000)
    expect(a).not.toBe(b)
  })

  it('resolves the starter system as 10 / 10 / 80', () => {
    const result = allocationOf(activeSystem(), 1_000_000)
    const amounts = getChildren(activeSystem(), activeSystem().rootId).map(
      (c) => result.amounts[c.id],
    )
    expect(amounts).toEqual([100_000, 100_000, 800_000])
  })
})

describe('income', () => {
  it('rounds and floors at zero', () => {
    get().setIncome(-100)
    expect(get().income).toBe(0)
    get().setIncome(1234.6)
    expect(get().income).toBe(1235)
  })
})

describe('managing diagrams', () => {
  const names = () =>
    get().systemOrder.map((id) => get().systems[id]?.name ?? '?')

  it('starts with exactly one diagram', () => {
    expect(get().systemOrder).toHaveLength(1)
    expect(get().activeSystemId).toBe(get().systemOrder[0])
  })

  it('creates a diagram, activates it, and gives it a starter tree', () => {
    const before = get().activeSystemId
    const id = get().createSystem()

    expect(id).not.toBe(before)
    expect(get().activeSystemId).toBe(id)
    expect(get().systemOrder).toEqual([before, id])
    expect(getChildren(activeSystem(), activeSystem().rootId)).toHaveLength(3)
  })

  it('keeps generated names unique', () => {
    get().createSystem()
    get().createSystem()
    get().createSystem()

    expect(names()).toEqual([
      'My allocation',
      'Allocation',
      'Allocation 2',
      'Allocation 3',
    ])
  })

  it('honours a supplied name, still de-duplicating', () => {
    get().createSystem('Business')
    get().createSystem('Business')
    expect(names()).toEqual(['My allocation', 'Business', 'Business 2'])
  })

  it('keeps diagrams independent of one another', () => {
    const first = get().activeSystemId
    const second = get().createSystem('Second')

    const child = getChildren(activeSystem(), activeSystem().rootId)[0]
    if (!child) throw new Error('no child')
    get().renameNode(child.id, 'Changed in second')

    get().selectSystem(first)
    const firstChild = getChildren(activeSystem(), activeSystem().rootId)[0]
    expect(firstChild?.name).toBe('Charity')

    get().selectSystem(second)
    expect(
      getChildren(activeSystem(), activeSystem().rootId)[0]?.name,
    ).toBe('Changed in second')
  })

  it('duplicates a diagram next to its original and opens the copy', () => {
    const source = get().activeSystemId
    get().createSystem('Other')

    const copy = get().duplicateSystem(source)
    if (!copy) throw new Error('duplicate failed')

    expect(get().activeSystemId).toBe(copy)
    expect(get().systemOrder).toEqual([source, copy, get().systemOrder[2]])
    expect(names()[1]).toBe('My allocation copy')
  })

  it('deep-copies a duplicate so edits do not bleed across', () => {
    const source = get().activeSystemId
    const copy = get().duplicateSystem(source)
    if (!copy) throw new Error('duplicate failed')

    const child = getChildren(activeSystem(), activeSystem().rootId)[0]
    if (!child) throw new Error('no child')
    get().renameNode(child.id, 'Only in the copy')
    get().setValue(child.id, 55)

    const original = get().systems[source]
    expect(original?.nodes[child.id]?.name).toBe('Charity')
    expect(original?.nodes[child.id]?.value).toBe(10)
  })

  it('carries manual positions into a duplicate without sharing them', () => {
    const source = get().activeSystemId
    const child = getChildren(activeSystem(), activeSystem().rootId)[0]
    if (!child) throw new Error('no child')
    get().setNodePosition(child.id, { x: 42, y: 42 })

    const copy = get().duplicateSystem(source)
    if (!copy) throw new Error('duplicate failed')

    expect(activeSystem().positions?.[child.id]).toEqual({ x: 42, y: 42 })

    get().setNodePosition(child.id, { x: 99, y: 99 })
    expect(get().systems[source]?.positions?.[child.id]).toEqual({ x: 42, y: 42 })
  })

  it('returns null when duplicating something that is not there', () => {
    expect(get().duplicateSystem('ghost')).toBeNull()
  })

  it('deletes a diagram', () => {
    const first = get().activeSystemId
    const second = get().createSystem('Second')

    get().deleteSystem(second)

    expect(get().systemOrder).toEqual([first])
    expect(get().systems[second]).toBeUndefined()
    expect(get().activeSystemId).toBe(first)
  })

  it('opens the neighbour that took the deleted one\'s place', () => {
    const a = get().activeSystemId
    const b = get().createSystem('B')
    const c = get().createSystem('C')

    get().selectSystem(b)
    get().deleteSystem(b)

    expect(get().activeSystemId).toBe(c)
    expect(get().systemOrder).toEqual([a, c])
  })

  it('falls back to the last diagram when the tail is deleted', () => {
    const a = get().activeSystemId
    const b = get().createSystem('B')

    get().selectSystem(b)
    get().deleteSystem(b)

    expect(get().activeSystemId).toBe(a)
  })

  it('leaves the active diagram alone when another is deleted', () => {
    const a = get().activeSystemId
    const b = get().createSystem('B')
    get().selectSystem(a)

    get().deleteSystem(b)

    expect(get().activeSystemId).toBe(a)
  })

  it('allows deleting the last diagram, leaving an empty list', () => {
    const only = get().activeSystemId
    get().deleteSystem(only)

    expect(get().systemOrder).toEqual([])
    expect(get().systems[only]).toBeUndefined()
    expect(get().activeSystemId).toBe('')
  })

  it('ignores a delete or select for an unknown id', () => {
    const before = get().activeSystemId
    get().createSystem('B')
    get().deleteSystem('ghost')
    get().selectSystem('ghost')

    expect(get().systemOrder).toHaveLength(2)
    expect(get().activeSystemId).not.toBe(before)
  })

  it('renames a diagram that is not the open one', () => {
    const first = get().activeSystemId
    const second = get().createSystem('Second')

    get().renameSystem(first, 'Renamed while closed')

    expect(get().systems[first]?.name).toBe('Renamed while closed')
    expect(get().activeSystemId).toBe(second)
  })

  it('clears the node selection when switching diagrams', () => {
    const first = get().activeSystemId
    const child = getChildren(activeSystem(), activeSystem().rootId)[0]
    if (!child) throw new Error('no child')
    get().selectNode(child.id)

    get().createSystem('Second')
    expect(get().selectedNodeId).toBeNull()

    get().selectNode('anything')
    get().selectSystem(first)
    expect(get().selectedNodeId).toBeNull()
  })
})

describe('theme', () => {
  it('defaults to following the system', () => {
    expect(get().theme).toBe('system')
  })

  it('stores an explicit choice', () => {
    get().setTheme('dark')
    expect(get().theme).toBe('dark')
    get().setTheme('light')
    expect(get().theme).toBe('light')
  })
})
