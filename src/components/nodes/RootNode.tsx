import { Handle, Position } from '@xyflow/react'
import { minorFactor, parseMoneyInput } from '../../domain/money'
import { getChildren } from '../../domain/tree'
import { useT } from '../../i18n'
import { useFormat } from '../../i18n/format'
import { useActiveSystem, useAllocation, useNodeIssues } from '../../store/selectors'
import { useAllocatorStore } from '../../store/useAllocatorStore'
import { GroupMeter } from './GroupMeter'
import { IssueBadge } from './IssueBadge'

/**
 * The single top node. Its "value" is the income itself, so it is the one node
 * whose amount is typed rather than derived.
 */
export function RootNode() {
  const t = useT()
  const format = useFormat(t)
  const system = useActiveSystem()
  const result = useAllocation()
  const issuesByNode = useNodeIssues()
  const income = useAllocatorStore((s) => s.income)
  const setIncome = useAllocatorStore((s) => s.setIncome)
  const addChild = useAllocatorStore((s) => s.addChild)
  const renameNode = useAllocatorStore((s) => s.renameNode)
  const selectNode = useAllocatorStore((s) => s.selectNode)
  const isSelected = useAllocatorStore((s) => s.selectedNodeId === system.rootId)

  const root = system.nodes[system.rootId]
  if (!root) return null

  const children = getChildren(system, root.id)

  return (
    <div
      className={`node node--root ${isSelected ? 'is-selected' : ''}`}
      onPointerDown={() => selectNode(root.id)}
    >
      <div className="node__head">
        <input
          className="node__name nodrag"
          value={root.name}
          placeholder={t('node.incomePlaceholder')}
          aria-label={t('node.rootNameLabel')}
          onChange={(e) => renameNode(root.id, e.target.value)}
        />
        <IssueBadge issues={issuesByNode[root.id]} />
      </div>

      <label className="income-field">
        <span>{t('topbar.monthlyIncome')}</span>
        <span className="income-field__control">
          <input
            className="nodrag nowheel"
            type="text"
            inputMode="numeric"
            value={
              income === 0
                ? ''
                : String(income / minorFactor(system.currencyDecimals))
            }
            placeholder="0"
            aria-label={t('topbar.monthlyIncome')}
            onChange={(e) => {
              const parsed = parseMoneyInput(e.target.value, system.currencyDecimals)
              setIncome(parsed ?? 0)
            }}
          />
          <span className="income-field__unit">{system.currency}</span>
        </span>
      </label>

      <div className="node__amount node__amount--root">
        {format.money(
          result.amounts[root.id] ?? 0,
          system.currency,
          system.currencyDecimals,
        )}
      </div>

      <GroupMeter
        system={system}
        siblings={children}
        available={result.amounts[root.id] ?? 0}
        stranded={result.unallocated[root.id] ?? 0}
      />

      <button
        type="button"
        className="node__add nodrag"
        onClick={() => addChild(root.id)}
      >
        {t('common.addChild')}
      </button>

      <Handle type="source" position={Position.Bottom} isConnectable={false} />
    </div>
  )
}
