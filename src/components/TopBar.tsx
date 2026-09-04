import { Link } from 'react-router-dom'
import { formatMoney, minorFactor, parseMoneyInput } from '../domain/money'
import { useActiveSystem, useAllocation } from '../store/selectors'
import { useAllocatorStore } from '../store/useAllocatorStore'
import { ThemeToggle } from './ThemeToggle'

/** Ties the toggle to the region it controls, for screen readers. */
export const SIDEBAR_ID = 'side-panels'

export function TopBar() {
  const system = useActiveSystem()
  const result = useAllocation()
  const income = useAllocatorStore((s) => s.income)
  const setIncome = useAllocatorStore((s) => s.setIncome)
  const renameSystem = useAllocatorStore((s) => s.renameSystem)
  const sidebarOpen = useAllocatorStore((s) => s.sidebarOpen)
  const toggleSidebar = useAllocatorStore((s) => s.toggleSidebar)

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <Link className="topbar__back" to="/" title="Back to all diagrams">
          <span aria-hidden="true">←</span>
          Diagrams
        </Link>
        <input
          className="topbar__title"
          value={system.name}
          placeholder="Untitled diagram"
          aria-label="Diagram name"
          onChange={(e) => renameSystem(system.id, e.target.value)}
        />
      </div>

      <label className="topbar__income">
        <span>Income</span>
        <span className="topbar__income-control">
          <input
            type="text"
            inputMode="numeric"
            value={income === 0 ? '' : String(income / minorFactor(system.currencyDecimals))}
            placeholder="0"
            aria-label="Monthly income"
            onChange={(e) => {
              const parsed = parseMoneyInput(e.target.value, system.currencyDecimals)
              setIncome(parsed ?? 0)
            }}
          />
          <span className="topbar__unit">{system.currency}</span>
        </span>
      </label>

      <div className="topbar__meta">
        <span className="topbar__stat">
          <em>{result.payouts.length}</em> accounts
        </span>
        <span className="topbar__stat">
          <em>
            {formatMoney(income, system.currency, system.currencyDecimals)}
          </em>{' '}
          to split
        </span>
      </div>

      <ThemeToggle />

      <button
        type="button"
        className="topbar__toggle"
        aria-expanded={sidebarOpen}
        aria-controls={SIDEBAR_ID}
        aria-label={sidebarOpen ? 'Hide panels' : 'Show panels'}
        title={sidebarOpen ? 'Hide panels' : 'Show panels'}
        onClick={toggleSidebar}
      >
        <span
          className={`hamburger ${sidebarOpen ? 'is-open' : ''}`}
          aria-hidden="true"
        >
          <span className="hamburger__bar" />
          <span className="hamburger__bar" />
          <span className="hamburger__bar" />
        </span>
      </button>
    </header>
  )
}
