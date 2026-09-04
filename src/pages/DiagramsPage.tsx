import { Link, useNavigate } from 'react-router-dom'
import { formatAmount } from '../domain/money'
import { formatRelativeTime } from '../domain/time'
import { getChildren } from '../domain/tree'
import type { AllocationSystem } from '../domain/types'
import { ThemeToggle } from '../components/ThemeToggle'
import { useAllocatorStore } from '../store/useAllocatorStore'

/** "Charity 10%", "Rent 300,000", "Living auto" — the top-level split. */
function splitSummary(system: AllocationSystem): string[] {
  return getChildren(system, system.rootId).map((child) => {
    const label = child.name.trim() || 'Untitled'
    if (child.mode === 'percent') return `${label} ${child.value}%`
    if (child.mode === 'fixed') {
      return `${label} ${formatAmount(child.value, system.currencyDecimals)}`
    }
    return `${label} auto`
  })
}

function DiagramCard({ system }: { system: AllocationSystem }) {
  const navigate = useNavigate()
  const renameSystem = useAllocatorStore((s) => s.renameSystem)
  const duplicateSystem = useAllocatorStore((s) => s.duplicateSystem)
  const deleteSystem = useAllocatorStore((s) => s.deleteSystem)

  const name = system.name.trim() || 'Untitled'
  const nodes = Object.keys(system.nodes).length
  const accounts = Object.values(system.nodes).filter(
    (n) => n.childIds.length === 0,
  ).length

  const parts = splitSummary(system)
  const shown = parts.slice(0, 3)
  const extra = parts.length - shown.length

  return (
    <li className="card">
      <input
        className="card__name"
        value={system.name}
        placeholder="Untitled diagram"
        aria-label={`Name of ${name}`}
        onChange={(e) => renameSystem(system.id, e.target.value)}
      />

      <p className="card__split">
        {parts.length === 0 ? (
          <span className="card__split--empty">No categories yet</span>
        ) : (
          <>
            {shown.join(' · ')}
            {extra > 0 ? ` · +${extra} more` : ''}
          </>
        )}
      </p>

      <p className="card__stats">
        {accounts} {accounts === 1 ? 'account' : 'accounts'} · {nodes} nodes
      </p>

      <p className="card__saved">
        Saved · edited {formatRelativeTime(system.updatedAt)}
      </p>

      <div className="card__actions">
        <Link className="btn btn--primary" to={`/d/${system.id}`}>
          Open
        </Link>
        <button
          type="button"
          className="btn"
          aria-label={`Duplicate ${name}`}
          title="Duplicate"
          onClick={() => duplicateSystem(system.id)}
        >
          Duplicate
        </button>
        <button
          type="button"
          className="btn btn--danger"
          aria-label={`Delete ${name}`}
          title="Delete"
          onClick={() => {
            if (window.confirm(`Delete "${name}"? This cannot be undone.`)) {
              deleteSystem(system.id)
            }
          }}
        >
          Delete
        </button>
      </div>

      {/* Whole-card affordance, kept out of the tab order so the buttons
          above stay the keyboard path. */}
      <button
        type="button"
        className="card__hit"
        tabIndex={-1}
        aria-hidden="true"
        onClick={() => navigate(`/d/${system.id}`)}
      />
    </li>
  )
}

/** The landing page: every saved diagram, and the way to make more. */
export function DiagramsPage() {
  const systems = useAllocatorStore((s) => s.systems)
  const systemOrder = useAllocatorStore((s) => s.systemOrder)
  const createSystem = useAllocatorStore((s) => s.createSystem)
  const navigate = useNavigate()

  const create = () => {
    const id = createSystem()
    navigate(`/d/${id}`)
  }

  const isEmpty = systemOrder.length === 0

  return (
    <div className="page">
      <header className="page__head">
        <span className="page__brand">
          <span className="topbar__mark" aria-hidden="true">
            ⑃
          </span>
          Money Allocator
        </span>
        <ThemeToggle />
      </header>

      <main className="page__body">
        <div className="page__title-row">
          <div>
            <h1 className="page__title">Diagrams</h1>
            <p className="page__subtitle">
              Each diagram is a way of splitting your monthly income. Everything
              is saved in this browser as you edit — no account, no server.
            </p>
          </div>
          {/* The empty state carries its own call to action; two identical
              buttons on one screen would just be noise. */}
          {isEmpty ? null : (
            <button type="button" className="btn btn--primary" onClick={create}>
              + New diagram
            </button>
          )}
        </div>

        {isEmpty ? (
          <div className="empty">
            <p className="empty__title">No diagrams yet</p>
            <p className="empty__body">
              Create one to map out where each month&rsquo;s income goes.
            </p>
            <button type="button" className="btn btn--primary" onClick={create}>
              + New diagram
            </button>
          </div>
        ) : (
          <ul className="cards">
            {systemOrder.map((id) => {
              const system = systems[id]
              if (!system) return null
              return <DiagramCard key={id} system={system} />
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
