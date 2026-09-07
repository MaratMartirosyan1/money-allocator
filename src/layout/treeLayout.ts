import type { Edge, Node } from '@xyflow/react'
import { getChildren, walkTree } from '../domain/tree'
import type { AllocNode, AllocationSystem } from '../domain/types'
import { tidyTree } from './tidyTree'

export const NODE_WIDTH = 248
export const NODE_SEP = 36
export const RANK_SEP = 72

/**
 * Node heights are estimated rather than measured, because the layout runs
 * before React has rendered anything. The numbers track the CSS box, taking
 * the tallest variant of each card (a `percent` node, whose value field is
 * taller than an `auto` node's remainder note) so that ranks can only ever
 * end up slightly roomy, never overlapping.
 */
export interface NodeMetrics {
  /** Every card is the same width — the canvas zooms instead of reflowing. */
  width: number
  nodeSep: number
  rankSep: number
  rootBase: number
  nodeBase: number
  /** Extra height for the sibling-group meter, which only parents show. */
  meter: number
}

export const DESKTOP_METRICS: NodeMetrics = {
  width: NODE_WIDTH,
  nodeSep: NODE_SEP,
  rankSep: RANK_SEP,
  rootBase: 186,
  nodeBase: 238,
  // The meter's caption is a fixed two-line box in CSS, so this number holds
  // in Armenian and Russian too, not only in the language it was measured in.
  meter: 48,
}

/**
 * Touch devices get taller cards, and the layout has to know.
 *
 * Every input inside a card goes to 16px under `(pointer: coarse)`, because
 * mobile Safari auto-zooms a focused input below that and never zooms back
 * out; the buttons grow to a 44px tap target for the same reason of being
 * usable with a thumb. Both make the card taller. Since heights here are
 * *estimated* rather than measured, an estimate that ignored the bump would
 * let ranks overlap — on phones only, which is exactly the sort of bug that
 * survives desktop testing.
 */
export const TOUCH_METRICS: NodeMetrics = {
  width: NODE_WIDTH,
  nodeSep: NODE_SEP,
  rankSep: 80,
  rootBase: 214,
  nodeBase: 280,
  meter: 48,
}

export function estimateHeight(
  node: AllocNode,
  metrics: NodeMetrics = DESKTOP_METRICS,
): number {
  const base = node.parentId === null ? metrics.rootBase : metrics.nodeBase
  return base + (node.childIds.length > 0 ? metrics.meter : 0)
}

export interface AllocNodeData extends Record<string, unknown> {
  nodeId: string
  isRoot: boolean
}

export type FlowNode = Node<AllocNodeData>

/**
 * Turns the system into React Flow nodes and edges. Automatic placement comes
 * from `tidyTree`; any node the user has dragged uses its stored position
 * instead, so a manual arrangement survives edits to the tree.
 */
export function layoutTree(
  system: AllocationSystem,
  metrics: NodeMetrics = DESKTOP_METRICS,
): {
  nodes: FlowNode[]
  edges: Edge[]
} {
  const auto = tidyTree(system, {
    width: metrics.width,
    nodeSep: metrics.nodeSep,
    rankSep: metrics.rankSep,
    heightOf: (node) => estimateHeight(node, metrics),
  })

  const nodes: FlowNode[] = []
  const edges: Edge[] = []

  walkTree(system, (node) => {
    const isRoot = node.parentId === null
    const manual = system.positions?.[node.id]
    const position = manual ?? auto[node.id] ?? { x: 0, y: 0 }

    nodes.push({
      id: node.id,
      type: isRoot ? 'rootNode' : 'allocNode',
      position,
      data: { nodeId: node.id, isRoot },
      draggable: true,
    })

    for (const child of getChildren(system, node.id)) {
      edges.push({
        id: `${node.id}->${child.id}`,
        source: node.id,
        target: child.id,
        type: 'smoothstep',
      })
    }
  })

  return { nodes, edges }
}
