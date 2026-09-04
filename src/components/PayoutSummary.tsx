import { formatMoney, formatPercent } from '../domain/money'
import { totalAccountedFor } from '../domain/engine'
import { useActiveSystem, useAllocation } from '../store/selectors'
import { useAllocatorStore } from '../store/useAllocatorStore'

/**
 * The answer to "how much does each account get this month". Leaves are the
 * accounts; money stranded on a parent gets its own rows so the table always
 * adds up to the income rather than quietly losing the difference.
 */
export function PayoutSummary() {
  const system = useActiveSystem()
  const result = useAllocation()
  const income = useAllocatorStore((s) => s.income)
  const selectNode = useAllocatorStore((s) => s.selectNode)
  const selectedNodeId = useAllocatorStore((s) => s.selectedNodeId)

  const money = (v: number) =>
    formatMoney(v, system.currency, system.currencyDecimals)

  const stranded = Object.entries(result.unallocated).filter(([, v]) => v > 0)
  const total = totalAccountedFor(result)
  const balanced = total === income

  return (
    <section className="panel">
      <header className="panel__head">
        <h2>Payouts</h2>
        <span className="panel__count">{result.payouts.length} accounts</span>
      </header>

      {income === 0 ? (
        <p className="panel__empty">
          Enter a monthly income on the top node to see the split.
        </p>
      ) : null}

      <table className="payouts">
        <tbody>
          {result.payouts.map((payout) => (
            <tr
              key={payout.nodeId}
              className={selectedNodeId === payout.nodeId ? 'is-selected' : ''}
              onClick={() => selectNode(payout.nodeId)}
            >
              <th scope="row">
                <span className="payouts__name">
                  {payout.name.trim() || 'Untitled'}
                </span>
                {payout.path.length > 1 ? (
                  <span className="payouts__path">
                    {payout.path.slice(0, -1).join(' › ')}
                  </span>
                ) : null}
              </th>
              <td className="payouts__pct">
                {formatPercent(result.percentOfIncome[payout.nodeId] ?? null, 1)}
              </td>
              <td className="payouts__amount">{money(payout.amount)}</td>
            </tr>
          ))}

          {stranded.map(([nodeId, amount]) => (
            <tr
              key={`unallocated-${nodeId}`}
              className="payouts__row--stranded"
              onClick={() => selectNode(nodeId)}
            >
              <th scope="row">
                <span className="payouts__name">Unallocated</span>
                <span className="payouts__path">
                  under {system.nodes[nodeId]?.name.trim() || 'Untitled'}
                </span>
              </th>
              <td className="payouts__pct">
                {formatPercent(income > 0 ? (amount / income) * 100 : null, 1)}
              </td>
              <td className="payouts__amount">{money(amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className={balanced ? '' : 'is-unbalanced'}>
            <th scope="row">Total</th>
            <td className="payouts__pct">{income > 0 ? '100%' : '—'}</td>
            <td className="payouts__amount">{money(total)}</td>
          </tr>
        </tfoot>
      </table>

      {balanced ? null : (
        <p className="panel__error">
          Accounted for {money(total)} of {money(income)} — this is a bug, please
          report it.
        </p>
      )}
    </section>
  )
}
