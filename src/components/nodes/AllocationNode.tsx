import { Handle, Position, type NodeProps } from '@xyflow/react'
import { getChildren } from '../../domain/tree'
import { percentHeadroom } from '../../domain/validate'
import { useT } from '../../i18n'
import { useFormat } from '../../i18n/format'
import type { FlowNode } from '../../layout/treeLayout'
import { useActiveSystem, useAllocation, useNodeIssues } from '../../store/selectors'
import { useAllocatorStore } from '../../store/useAllocatorStore'
import { GroupMeter } from './GroupMeter'
import { IssueBadge } from './IssueBadge'
import { ModeToggle } from './ModeToggle'
import { ValueField } from './ValueField'

export function AllocationNode({ data }: NodeProps<FlowNode>) {
  const nodeId = data.nodeId
  const t = useT()
  const format = useFormat(t)
  const system = useActiveSystem()
  const result = useAllocation()
  const issuesByNode = useNodeIssues()

  const renameNode = useAllocatorStore((s) => s.renameNode)
  const setValue = useAllocatorStore((s) => s.setValue)
  const setMode = useAllocatorStore((s) => s.setMode)
  const addChild = useAllocatorStore((s) => s.addChild)
  const removeNode = useAllocatorStore((s) => s.removeNode)
  const selectNode = useAllocatorStore((s) => s.selectNode)
  const isSelected = useAllocatorStore((s) => s.selectedNodeId === nodeId)

  const node = system.nodes[nodeId]
  if (!node || node.parentId === null) return null

  const children = getChildren(system, nodeId)
  const amount = result.amounts[nodeId] ?? 0
  const ofParent = result.percentOfParent[nodeId] ?? null
  const ofIncome = result.percentOfIncome[nodeId] ?? null
  const headroom = percentHeadroom(system, node.parentId, nodeId)
  const descendantCount = children.length

  const handleDelete = () => {
    // Deleting a branch takes its whole subtree with it, so say so first.
    if (descendantCount > 0) {
      const label = node.name.trim() || t('node.thisNode')
      const ok = window.confirm(t('node.deleteSubtree', { name: label }))
      if (!ok) return
    }
    removeNode(nodeId)
  }

  return (
    <div
      className={`node node--${node.mode} ${isSelected ? 'is-selected' : ''}`}
      onPointerDown={() => selectNode(nodeId)}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} />

      <div className="node__head">
        <input
          className="node__name nodrag"
          value={node.name}
          placeholder={t('common.untitled')}
          aria-label={t('node.nameLabel')}
          onChange={(e) => renameNode(nodeId, e.target.value)}
        />
        <IssueBadge issues={issuesByNode[nodeId]} />
        <button
          type="button"
          className="node__delete nodrag"
          title={t('node.delete')}
          aria-label={t('node.delete')}
          onClick={handleDelete}
        >
          ×
        </button>
      </div>

      <ModeToggle value={node.mode} onChange={(mode) => setMode(nodeId, mode)} />

      {node.mode === 'auto' ? (
        <div className="auto-note">
          {t('node.takesRemainder')}
          <strong>{format.percent(ofParent)}</strong>
        </div>
      ) : (
        <ValueField
          mode={node.mode}
          value={node.value}
          headroom={headroom}
          currency={system.currency}
          decimals={system.currencyDecimals}
          onCommit={(v) => setValue(nodeId, v)}
        />
      )}

      <div className="node__amount">
        {format.money(amount, system.currency, system.currencyDecimals)}
        <span className="node__of-income">
          {ofIncome === null
            ? ''
            : t('node.ofIncome', { percent: format.percent(ofIncome) })}
        </span>
      </div>

      <GroupMeter
        system={system}
        siblings={children}
        available={amount}
        stranded={result.unallocated[nodeId] ?? 0}
      />

      <button
        type="button"
        className="node__add nodrag"
        onClick={() => addChild(nodeId)}
      >
        {t('common.addChild')}
      </button>

      <Handle type="source" position={Position.Bottom} isConnectable={false} />
    </div>
  )
}
