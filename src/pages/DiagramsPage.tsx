import { Link, useNavigate } from 'react-router-dom'
import { getChildren } from '../domain/tree'
import type { AllocationSystem } from '../domain/types'
import { useT, type Translate } from '../i18n'
import { useFormat, type Formatters } from '../i18n/format'
import { LocaleToggle } from '../components/LocaleToggle'
import { ThemeToggle } from '../components/ThemeToggle'
import { useAllocatorStore } from '../store/useAllocatorStore'

/** "Charity 10%", "Rent 300,000", "Living auto" — the top-level split. */
function splitSummary(
  system: AllocationSystem,
  t: Translate,
  format: Formatters,
): string[] {
  return getChildren(system, system.rootId).map((child) => {
    const label = child.name.trim() || t('common.untitled')
    if (child.mode === 'percent') return `${label} ${child.value}%`
    if (child.mode === 'fixed') {
      return `${label} ${format.amount(child.value, system.currencyDecimals)}`
    }
    return `${label} ${t('common.auto')}`
  })
}

function DiagramCard({ system }: { system: AllocationSystem }) {
  const t = useT()
  const format = useFormat(t)
  const navigate = useNavigate()
  const renameSystem = useAllocatorStore((s) => s.renameSystem)
  const duplicateSystem = useAllocatorStore((s) => s.duplicateSystem)
  const deleteSystem = useAllocatorStore((s) => s.deleteSystem)

  const name = system.name.trim() || t('common.untitled')
  const nodes = Object.keys(system.nodes).length
  const accounts = Object.values(system.nodes).filter(
    (n) => n.childIds.length === 0,
  ).length

  const parts = splitSummary(system, t, format)
  const shown = parts.slice(0, 3)
  const extra = parts.length - shown.length

  return (
    <li className="card">
      <input
        className="card__name"
        value={system.name}
        placeholder={t('topbar.untitledDiagram')}
        aria-label={t('card.nameOf', { name })}
        onChange={(e) => renameSystem(system.id, e.target.value)}
      />

      <p className="card__split">
        {parts.length === 0 ? (
          <span className="card__split--empty">{t('card.noCategories')}</span>
        ) : (
          <>
            {shown.join(' · ')}
            {extra > 0 ? ` · ${t('card.more', { count: extra })}` : ''}
          </>
        )}
      </p>

      <p className="card__stats">
        {t('card.accounts', { count: accounts })} ·{' '}
        {t('card.nodes', { count: nodes })}
      </p>

      <p className="card__saved">
        {t('card.savedEdited', { when: format.relativeTime(system.updatedAt) })}
      </p>

      <div className="card__actions">
        <Link className="btn btn--primary" to={`/d/${system.id}`}>
          {t('common.open')}
        </Link>
        <button
          type="button"
          className="btn"
          aria-label={t('card.duplicateOf', { name })}
          title={t('common.duplicate')}
          onClick={() => duplicateSystem(system.id)}
        >
          {t('common.duplicate')}
        </button>
        <button
          type="button"
          className="btn btn--danger"
          aria-label={t('card.deleteOf', { name })}
          title={t('common.delete')}
          onClick={() => {
            if (window.confirm(t('card.deleteConfirm', { name }))) {
              deleteSystem(system.id)
            }
          }}
        >
          {t('common.delete')}
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
  const t = useT()
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
          {t('app.name')}
        </span>
        <div className="page__tools">
          <LocaleToggle />
          <ThemeToggle />
        </div>
      </header>

      <main className="page__body">
        <div className="page__title-row">
          <div>
            <h1 className="page__title">{t('list.title')}</h1>
            <p className="page__subtitle">{t('list.subtitle')}</p>
          </div>
          {/* The empty state carries its own call to action; two identical
              buttons on one screen would just be noise. */}
          {isEmpty ? null : (
            <button type="button" className="btn btn--primary" onClick={create}>
              {t('common.newDiagram')}
            </button>
          )}
        </div>

        {isEmpty ? (
          <div className="empty">
            <p className="empty__title">{t('list.emptyTitle')}</p>
            <p className="empty__body">{t('list.emptyBody')}</p>
            <button type="button" className="btn btn--primary" onClick={create}>
              {t('common.newDiagram')}
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
