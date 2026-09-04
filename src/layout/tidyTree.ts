import { getChildren } from '../domain/tree'
import type { AllocNode, AllocationSystem, NodePosition } from '../domain/types'

export interface TidyOptions {
  /** Every card is the same width, which keeps the packing arithmetic simple. */
  width: number
  /** Horizontal gap between adjacent leaves. */
  nodeSep: number
  /** Vertical gap between ranks. */
  rankSep: number
  heightOf: (node: AllocNode) => number
}

/**
 * A tidy top-down tree layout.
 *
 * This replaces dagre deliberately. Dagre is a general layered-graph engine:
 * it runs a crossing-minimization pass that reorders nodes within a rank, and
 * for a tree it happens to emit siblings in *reverse* insertion order — so a
 * newly appended child lands on the far left. There is no supported way to pin
 * that ordering. Since this graph is always a strict tree, a direct layout
 * gives the ordering we actually want by construction.
 *
 * Leaves are packed left to right in `childIds` order; every parent is then
 * centred over its own first and last child. That centring keeps each node's
 * box inside its own subtree's horizontal span, and sibling spans are disjoint
 * by at least `nodeSep`, so nodes can never overlap at any depth.
 */
export function tidyTree(
  system: AllocationSystem,
  opts: TidyOptions,
): Record<string, NodePosition> {
  const root = system.nodes[system.rootId]
  if (!root) return {}

  // ---- 1. depth of each node, honouring childIds order -------------------
  const depth: Record<string, number> = {}
  const ranks: AllocNode[][] = []
  const seen = new Set<string>()

  const assignDepth = (node: AllocNode, d: number): void => {
    if (seen.has(node.id)) return
    seen.add(node.id)
    depth[node.id] = d
    const rank = ranks[d] ?? []
    rank.push(node)
    ranks[d] = rank
    for (const child of getChildren(system, node.id)) assignDepth(child, d + 1)
  }
  assignDepth(root, 0)

  // ---- 2. one y per rank, tallest card in the rank setting its height ----
  const rankHeight = ranks.map((row) =>
    row.reduce((tallest, node) => Math.max(tallest, opts.heightOf(node)), 0),
  )
  const rankY: number[] = []
  let cursor = 0
  for (let d = 0; d < rankHeight.length; d++) {
    rankY[d] = cursor
    cursor += (rankHeight[d] ?? 0) + opts.rankSep
  }

  // ---- 3. pack leaves, centre parents over them --------------------------
  const positions: Record<string, NodePosition> = {}
  let nextLeafX = 0

  /** Places `node`'s subtree and returns the node's centre x. */
  const place = (node: AllocNode): number => {
    const d = depth[node.id] ?? 0
    // Only real children — a cycle would have been dropped by the depth pass.
    const kids = getChildren(system, node.id).filter(
      (child) => depth[child.id] === d + 1,
    )

    let centreX: number
    if (kids.length === 0) {
      centreX = nextLeafX + opts.width / 2
      nextLeafX += opts.width + opts.nodeSep
    } else {
      let first = 0
      let last = 0
      kids.forEach((child, i) => {
        const childCentre = place(child)
        if (i === 0) first = childCentre
        last = childCentre
      })
      centreX = (first + last) / 2
    }

    positions[node.id] = {
      x: centreX - opts.width / 2,
      // Centre shorter cards within their rank so rows read as rows.
      y: (rankY[d] ?? 0) + ((rankHeight[d] ?? 0) - opts.heightOf(node)) / 2,
    }

    return centreX
  }

  place(root)

  return positions
}
