import { useT } from '../../i18n'
import { issueMessageWith } from '../../i18n/issues'
import type { NodeIssues } from '../../store/selectors'

export function IssueBadge({ issues }: { issues: NodeIssues | undefined }) {
  const t = useT()
  if (!issues) return null
  const { errors, warnings } = issues
  if (errors.length === 0 && warnings.length === 0) return null

  const level = errors.length > 0 ? 'error' : 'warning'
  const list = errors.length > 0 ? errors : warnings

  return (
    <span
      className={`issue-badge issue-badge--${level}`}
      title={list.map((issue) => issueMessageWith(t, issue)).join('\n')}
      aria-label={t(level === 'error' ? 'badge.errors' : 'badge.warnings', {
        count: list.length,
      })}
    >
      {level === 'error' ? '!' : '?'}
    </span>
  )
}
