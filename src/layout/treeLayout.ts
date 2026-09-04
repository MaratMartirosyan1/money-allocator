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
const ROOT_BASE = 186
const NODE_BASE = 238
const METER = 31

export function estimateHeight(node: AllocNode): number {
  const base = node.parentId === null ? ROOT_BASE : NODE_BASE
  return base + (node.childIds.length > 0 ? METER : 0)
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
export function layoutTree(system: AllocationSystem): {
  nodes: FlowNode[]
  edges: Edge[]
} {
  const auto = tidyTree(system, {
    width: NODE_WIDTH,
    nodeSep: NODE_SEP,
    rankSep: RANK_SEP,
    heightOf: estimateHeight,
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
