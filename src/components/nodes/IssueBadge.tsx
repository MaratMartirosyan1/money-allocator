import type { NodeIssues } from '../../store/selectors'

export function IssueBadge({ issues }: { issues: NodeIssues | undefined }) {
  if (!issues) return null
  const { errors, warnings } = issues
  if (errors.length === 0 && warnings.length === 0) return null

  const level = errors.length > 0 ? 'error' : 'warning'
  const list = errors.length > 0 ? errors : warnings

  return (
    <span
      className={`issue-badge issue-badge--${level}`}
      title={list.map((i) => i.message).join('\n')}
      aria-label={`${list.length} ${level}${list.length === 1 ? '' : 's'}`}
    >
      {level === 'error' ? '!' : '?'}
    </span>
  )
}
