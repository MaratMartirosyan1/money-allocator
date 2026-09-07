import { getChildren, partitionGroup } from '../domain/tree'
import type { Issue } from '../domain/types'
import { useT } from '../i18n'
import { issueMessageWith } from '../i18n/issues'
import { useActiveSystem, useIssues } from '../store/selectors'
import { useAllocatorStore } from '../store/useAllocatorStore'

/** Codes that a single click can put right. */
const AUTO_FIXABLE = new Set<Issue['code']>([
  'UNALLOCATED_REMAINDER',
  'FIXED_WITHOUT_AUTO_SIBLING',
])

export function IssueList() {
  const t = useT()
  const system = useActiveSystem()
  const issues = useIssues()
  const selectNode = useAllocatorStore((s) => s.selectNode)
  const addChild = useAllocatorStore((s) => s.addChild)
  const setMode = useAllocatorStore((s) => s.setMode)

  const errors = issues.filter((i) => i.level === 'error')
  const warnings = issues.filter((i) => i.level === 'warning')

  /**
   * Give the leftover money somewhere to go: convert a zero-percent sibling to
   * `auto` if one is going spare, otherwise add a fresh `auto` child.
   */
  const giveRemainderAHome = (parentId: string) => {
    const siblings = getChildren(system, parentId)
    const { percentKids } = partitionGroup(siblings)
    const spare = percentKids.find((c) => c.value === 0)

    if (spare) {
      setMode(spare.id, 'auto')
      selectNode(spare.id)
      return
    }

    const id = addChild(parentId)
    if (id) setMode(id, 'auto')
  }

  if (issues.length === 0) {
    return (
      <section className="panel">
        <header className="panel__head">
          <h2>{t('checks.title')}</h2>
        </header>
        <p className="panel__ok">{t('checks.allGood')}</p>
      </section>
    )
  }

  const render = (issue: Issue, index: number) => {
    const label = system.nodes[issue.nodeId]?.name.trim() || t('common.untitled')
    return (
      <li key={`${issue.code}-${issue.nodeId}-${index}`} className={`issue issue--${issue.level}`}>
        <button
          type="button"
          className="issue__body"
          onClick={() => selectNode(issue.nodeId)}
          title={t('checks.goTo', { name: label })}
        >
          {issueMessageWith(t, issue)}
        </button>
        {AUTO_FIXABLE.has(issue.code) ? (
          <button
            type="button"
            className="issue__fix"
            onClick={() => giveRemainderAHome(issue.nodeId)}
          >
            {t('checks.absorb')}
          </button>
        ) : null}
      </li>
    )
  }

  return (
    <section className="panel">
      <header className="panel__head">
        <h2>{t('checks.title')}</h2>
        <span className="panel__count">
          {errors.length > 0
            ? t('checks.toFix', { count: errors.length })
            : t('checks.notes', { count: warnings.length })}
        </span>
      </header>
      <ul className="issues">
        {errors.map(render)}
        {warnings.map(render)}
      </ul>
    </section>
  )
}
