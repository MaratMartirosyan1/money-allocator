import { Link } from 'react-router-dom'
import { minorFactor, parseMoneyInput } from '../domain/money'
import { useT } from '../i18n'
import { useFormat } from '../i18n/format'
import { useActiveSystem, useAllocation } from '../store/selectors'
import { useAllocatorStore } from '../store/useAllocatorStore'
import { SettingsMenu } from './SettingsMenu'

/** Ties the toggle to the region it controls, for screen readers. */
export const SIDEBAR_ID = 'side-panels'

export function TopBar() {
  const t = useT()
  const format = useFormat(t)
  const system = useActiveSystem()
  const result = useAllocation()
  const income = useAllocatorStore((s) => s.income)
  const setIncome = useAllocatorStore((s) => s.setIncome)
  const renameSystem = useAllocatorStore((s) => s.renameSystem)
  const sidebarOpen = useAllocatorStore((s) => s.sidebarOpen)
  const toggleSidebar = useAllocatorStore((s) => s.toggleSidebar)

  const panelsLabel = sidebarOpen ? t('topbar.hidePanels') : t('topbar.showPanels')

  return (
    <header className="topbar">
      {/*
        Three groups, in the order they are read: what you are editing, the
        money, then the controls.

        On wide screens the wrappers dissolve (`display: contents`) and the bar
        lays out exactly as one flat row — so the phone layout below costs the
        desktop nothing, and, more to the point, no `order` override is needed
        anywhere. Visual order and DOM order stay the same order, which is the
        one a keyboard follows.
      */}
      <div className="topbar__row topbar__row--main">
        <div className="topbar__brand">
          {/* Below 380px the word is hidden *visually only* — see
              .topbar__back-text — so that the link's accessible name stays its
              own text rather than moving to an aria-label that then has to be
              kept in sync with it. */}
          <Link className="topbar__back" to="/" title={t('nav.backTitle')}>
            <span aria-hidden="true">←</span>
            <span className="topbar__back-text">{t('nav.diagrams')}</span>
          </Link>
          <input
            className="topbar__title"
            value={system.name}
            placeholder={t('topbar.untitledDiagram')}
            aria-label={t('topbar.diagramName')}
            onChange={(e) => renameSystem(system.id, e.target.value)}
          />
        </div>
      </div>

      <div className="topbar__row topbar__row--income">
        <label className="topbar__income">
          <span>{t('topbar.income')}</span>
          <span className="topbar__income-control">
            <input
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
                const parsed = parseMoneyInput(
                  e.target.value,
                  system.currencyDecimals,
                )
                setIncome(parsed ?? 0)
              }}
            />
            <span className="topbar__unit">{system.currency}</span>
          </span>
        </label>

        <div className="topbar__meta">
          <span className="topbar__stat">
            <em>{result.payouts.length}</em>{' '}
            {t('topbar.accountsNoun', { count: result.payouts.length })}
          </span>
          <span className="topbar__stat">
            <em>
              {format.money(income, system.currency, system.currencyDecimals)}
            </em>{' '}
            {t('topbar.toSplit')}
          </span>
        </div>
      </div>

      <div className="topbar__row topbar__row--tools">
        <SettingsMenu />

        <button
          type="button"
          className="topbar__toggle"
          aria-expanded={sidebarOpen}
          aria-controls={SIDEBAR_ID}
          aria-label={panelsLabel}
          title={panelsLabel}
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
      </div>
    </header>
  )
}
