import {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  useReactFlow,
  type NodeChange,
  type NodeTypes,
} from '@xyflow/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { layoutTree, type FlowNode } from '../layout/treeLayout'
import { useActiveSystem } from '../store/selectors'
import { useAllocatorStore } from '../store/useAllocatorStore'
import { AllocationNode } from './nodes/AllocationNode'
import { RootNode } from './nodes/RootNode'

const nodeTypes: NodeTypes = {
  rootNode: RootNode,
  allocNode: AllocationNode,
}

function Canvas() {
  const system = useActiveSystem()
  const selectNode = useAllocatorStore((s) => s.selectNode)
  const setNodePosition = useAllocatorStore((s) => s.setNodePosition)
  const clearPositions = useAllocatorStore((s) => s.clearPositions)
  const { fitView } = useReactFlow()

  // Positions only change when the tree or a stored position changes, so the
  // layout is memoized on the system object identity.
  const { nodes: laidOut, edges } = useMemo(() => layoutTree(system), [system])

  /**
   * Dragging is held locally and committed to the store on drag stop. Writing
   * on every pointer move would re-run the layout dozens of times a second.
   */
  const [nodes, setNodes] = useState<FlowNode[]>(laidOut)
  const dragging = useRef(false)

  useEffect(() => {
    if (dragging.current) return
    setNodes(laidOut)
  }, [laidOut])

  const onNodesChange = useCallback((changes: NodeChange<FlowNode>[]) => {
    setNodes((current) => applyNodeChanges(changes, current))
  }, [])

  // Re-frame when nodes are added or removed, but not while the user is only
  // editing values or dragging — that would yank the viewport out from under
  // them.
  const shape = laidOut.length
  const lastShape = useRef(-1)
  useEffect(() => {
    if (lastShape.current === shape) return
    lastShape.current = shape
    const id = requestAnimationFrame(() => {
      void fitView({ padding: 0.18, duration: 260, maxZoom: 1 })
    })
    return () => cancelAnimationFrame(id)
  }, [shape, fitView])

  const hasManualPositions = Object.keys(system.positions ?? {}).length > 0

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onNodeDragStart={() => {
        dragging.current = true
      }}
      onNodeDragStop={(_, node) => {
        dragging.current = false
        setNodePosition(node.id, node.position)
      }}
      nodesDraggable
      nodesConnectable={false}
      edgesFocusable={false}
      minZoom={0.2}
      maxZoom={1.6}
      fitView
      fitViewOptions={{ padding: 0.18, maxZoom: 1 }}
      onPaneClick={() => selectNode(null)}
    >
      <Background gap={20} size={1} />
      <Controls showInteractive={false} />
      <MiniMap pannable zoomable nodeStrokeWidth={3} />
      {hasManualPositions ? (
        <Panel position="top-right">
          <button
            type="button"
            className="canvas__tidy"
            onClick={() => {
              clearPositions()
              requestAnimationFrame(() => {
                void fitView({ padding: 0.18, duration: 260, maxZoom: 1 })
              })
            }}
          >
            Tidy up
          </button>
        </Panel>
      ) : null}
    </ReactFlow>
  )
}

export function AllocatorCanvas() {
  return (
    <ReactFlowProvider>
      <Canvas />
    </ReactFlowProvider>
  )
}
