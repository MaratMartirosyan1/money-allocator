import { describe, expect, it } from 'vitest'
import { createNode, emptySystem, starterSystem } from '../domain/factory'
import { getChildren } from '../domain/tree'
import type { AllocNode, AllocationSystem } from '../domain/types'
import { NODE_SEP, NODE_WIDTH, estimateHeight, layoutTree } from './treeLayout'
import { tidyTree } from './tidyTree'

function addChild(
  system: AllocationSystem,
  parentId: string,
  name: string,
): AllocNode {
  const node = createNode(parentId, { name, mode: 'auto' })
  system.nodes[node.id] = node
  const parent = system.nodes[parentId]
  if (!parent) throw new Error('no parent')
  parent.childIds = [...parent.childIds, node.id]
  return node
}

const positionOf = (nodes: ReturnType<typeof layoutTree>['nodes'], id: string) => {
  const found = nodes.find((n) => n.id === id)
  if (!found) throw new Error(`no laid-out node ${id}`)
  return found.position
}

describe('layoutTree', () => {
  it('emits one node per tree node and one edge per parent link', () => {
    const system = starterSystem()
    const { nodes, edges } = layoutTree(system)

    expect(nodes).toHaveLength(4)
    expect(edges).toHaveLength(3)
    expect(nodes[0]?.type).toBe('rootNode')
    expect(nodes.slice(1).every((n) => n.type === 'allocNode')).toBe(true)
  })

  it('makes every node draggable', () => {
    const { nodes } = layoutTree(starterSystem())
    expect(nodes.every((n) => n.draggable)).toBe(true)
  })

  it('ranks children strictly below their parent', () => {
    const system = starterSystem()
    const { nodes } = layoutTree(system)
    const root = positionOf(nodes, system.rootId)

    for (const node of nodes) {
      if (node.id === system.rootId) continue
      expect(node.position.y).toBeGreaterThan(root.y)
    }
  })

  /** The regression this layout exists for. */
  it('places siblings left to right in childIds order', () => {
    const system = starterSystem()
    const order = getChildren(system, system.rootId).map((c) => c.id)
    const { nodes } = layoutTree(system)

    const xs = order.map((id) => positionOf(nodes, id).x)
    const sorted = [...xs].sort((a, b) => a - b)
    expect(xs).toEqual(sorted)
  })

  it('puts a newly added child on the right of its siblings', () => {
    const system = starterSystem()
    const added = addChild(system, system.rootId, 'Newest')
    const { nodes } = layoutTree(system)

    const addedX = positionOf(nodes, added.id).x
    const others = getChildren(system, system.rootId)
      .filter((c) => c.id !== added.id)
      .map((c) => positionOf(nodes, c.id).x)

    expect(Math.max(...others)).toBeLessThan(addedX)
  })

  it('keeps a new child rightmost even when an earlier sibling is deep', () => {
    const system = starterSystem()
    const [first] = getChildren(system, system.rootId)
    if (!first) throw new Error('no first child')

    // Give the first sibling a wide subtree, which is what made dagre
    // reshuffle the ranks.
    const branch = addChild(system, first.id, 'Deep A')
    addChild(system, first.id, 'Deep B')
    addChild(system, branch.id, 'Deeper')

    const added = addChild(system, system.rootId, 'Newest')
    const { nodes } = layoutTree(system)

    const addedX = positionOf(nodes, added.id).x
    const others = getChildren(system, system.rootId)
      .filter((c) => c.id !== added.id)
      .map((c) => positionOf(nodes, c.id).x)

    expect(Math.max(...others)).toBeLessThan(addedX)
  })

  it('centres a parent over its children', () => {
    const system = starterSystem()
    const { nodes } = layoutTree(system)

    const kids = getChildren(system, system.rootId).map(
      (c) => positionOf(nodes, c.id).x,
    )
    const first = Math.min(...kids)
    const last = Math.max(...kids)

    expect(positionOf(nodes, system.rootId).x).toBeCloseTo((first + last) / 2, 5)
  })

  it('honours a manual position and leaves its siblings on the layout', () => {
    const system = starterSystem()
    const [first, second] = getChildren(system, system.rootId)
    if (!first || !second) throw new Error('no siblings')

    const autoSecond = positionOf(layoutTree(system).nodes, second.id)
    system.positions = { [first.id]: { x: -900, y: -400 } }
    const { nodes } = layoutTree(system)

    expect(positionOf(nodes, first.id)).toEqual({ x: -900, y: -400 })
    expect(positionOf(nodes, second.id)).toEqual(autoSecond)
  })

  it('skips dangling child ids instead of throwing', () => {
    const system = emptySystem()
    const real = addChild(system, system.rootId, 'Real')
    const root = system.nodes[system.rootId]
    if (root) root.childIds = [real.id, 'does-not-exist']

    const { nodes, edges } = layoutTree(system)

    expect(nodes).toHaveLength(2)
    expect(edges).toHaveLength(1)
  })

  it('handles a root with no children', () => {
    const { nodes, edges } = layoutTree(emptySystem())
    expect(nodes).toHaveLength(1)
    expect(edges).toHaveLength(0)
  })
})

describe('tidyTree', () => {
  const opts = {
    width: NODE_WIDTH,
    nodeSep: NODE_SEP,
    rankSep: 72,
    heightOf: estimateHeight,
  }

  /** Builds a tree from a nested shape spec. */
  function treeOf(shape: number[][]): AllocationSystem {
    const system = emptySystem()
    let frontier = [system.rootId]
    for (const [depthIndex, counts] of shape.entries()) {
      const next: string[] = []
      frontier.forEach((parentId, i) => {
        const count = counts[i] ?? 0
        for (let k = 0; k < count; k++) {
          next.push(addChild(system, parentId, `d${depthIndex}-${i}-${k}`).id)
        }
      })
      frontier = next
    }
    return system
  }

  it('never overlaps two nodes on the same rank', () => {
    const shapes: number[][][] = [
      [[3]],
      [[2], [3, 1]],
      [[4], [1, 3, 0, 2]],
      [[3], [2, 0, 4], [1, 1, 2, 2, 1, 3]],
      [[1], [1], [1], [5]],
    ]

    for (const shape of shapes) {
      const system = treeOf(shape)
      const positions = tidyTree(system, opts)

      // Group by y, then check horizontal separation within each row.
      const rows = new Map<number, number[]>()
      for (const [, pos] of Object.entries(positions)) {
        const row = rows.get(pos.y) ?? []
        row.push(pos.x)
        rows.set(pos.y, row)
      }

      for (const xs of rows.values()) {
        const sorted = [...xs].sort((a, b) => a - b)
        for (let i = 1; i < sorted.length; i++) {
          const gap = (sorted[i] ?? 0) - (sorted[i - 1] ?? 0)
          expect(gap).toBeGreaterThanOrEqual(NODE_WIDTH)
        }
      }
    }
  })

  it('keeps every parent inside its own subtree span', () => {
    const system = treeOf([[3], [2, 3, 1]])
    const positions = tidyTree(system, opts)

    const spanOf = (id: string): [number, number] => {
      const kids = getChildren(system, id)
      const self = positions[id]
      if (!self) throw new Error('missing position')
      if (kids.length === 0) return [self.x, self.x + NODE_WIDTH]
      const spans = kids.map((k) => spanOf(k.id))
      return [
        Math.min(...spans.map((s) => s[0])),
        Math.max(...spans.map((s) => s[1])),
      ]
    }

    for (const id of Object.keys(system.nodes)) {
      const pos = positions[id]
      const [left, right] = spanOf(id)
      if (!pos) throw new Error('missing position')
      expect(pos.x).toBeGreaterThanOrEqual(left - 0.001)
      expect(pos.x + NODE_WIDTH).toBeLessThanOrEqual(right + 0.001)
    }
  })

  it('returns nothing for a system with no root', () => {
    const system = emptySystem()
    system.rootId = 'gone'
    expect(tidyTree(system, opts)).toEqual({})
  })

  it('does not recurse forever on a cycle', () => {
    const system = emptySystem()
    const a = addChild(system, system.rootId, 'A')
    const b = addChild(system, a.id, 'B')
    system.nodes[b.id] = { ...b, childIds: [a.id] }

    const positions = tidyTree(system, opts)
    expect(Object.keys(positions)).toHaveLength(3)
  })
})
