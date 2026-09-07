import { totalAccountedFor } from '../domain/engine'
import { useT } from '../i18n'
import { useFormat } from '../i18n/format'
import { useActiveSystem, useAllocation } from '../store/selectors'
import { useAllocatorStore } from '../store/useAllocatorStore'

/**
 * The answer to "how much does each account get this month". Leaves are the
 * accounts; money stranded on a parent gets its own rows so the table always
 * adds up to the income rather than quietly losing the difference.
 */
export function PayoutSummary() {
  const t = useT()
  const format = useFormat(t)
  const system = useActiveSystem()
  const result = useAllocation()
  const income = useAllocatorStore((s) => s.income)
  const selectNode = useAllocatorStore((s) => s.selectNode)
  const selectedNodeId = useAllocatorStore((s) => s.selectedNodeId)

  const money = (v: number) =>
    format.money(v, system.currency, system.currencyDecimals)

  const stranded = Object.entries(result.unallocated).filter(([, v]) => v > 0)
  const total = totalAccountedFor(result)
  const balanced = total === income

  return (
    <section className="panel">
      <header className="panel__head">
        <h2>{t('payouts.title')}</h2>
        <span className="panel__count">
          {t('payouts.accounts', { count: result.payouts.length })}
        </span>
      </header>

      {income === 0 ? <p className="panel__empty">{t('payouts.empty')}</p> : null}

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
                  {payout.name.trim() || t('common.untitled')}
                </span>
                {payout.path.length > 1 ? (
                  <span className="payouts__path">
                    {payout.path.slice(0, -1).join(' › ')}
                  </span>
                ) : null}
              </th>
              <td className="payouts__pct">
                {format.percent(result.percentOfIncome[payout.nodeId] ?? null, 1)}
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
                <span className="payouts__name">{t('payouts.unallocated')}</span>
                <span className="payouts__path">
                  {t('payouts.under', {
                    name:
                      system.nodes[nodeId]?.name.trim() || t('common.untitled'),
                  })}
                </span>
              </th>
              <td className="payouts__pct">
                {format.percent(income > 0 ? (amount / income) * 100 : null, 1)}
              </td>
              <td className="payouts__amount">{money(amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className={balanced ? '' : 'is-unbalanced'}>
            <th scope="row">{t('payouts.total')}</th>
            <td className="payouts__pct">
              {income > 0 ? format.percent(100, 0) : '—'}
            </td>
            <td className="payouts__amount">{money(total)}</td>
          </tr>
        </tfoot>
      </table>

      {balanced ? null : (
        <p className="panel__error">
          {t('payouts.mismatch', { total: money(total), income: money(income) })}
        </p>
      )}
    </section>
  )
}
