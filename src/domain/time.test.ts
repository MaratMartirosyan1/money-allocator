import { describe, expect, it } from 'vitest'
import { formatRelativeTime } from './time'

const at = (ms: number) => new Date(Date.UTC(2026, 0, 15, 12, 0, 0) - ms).toISOString()
const now = Date.UTC(2026, 0, 15, 12, 0, 0)

describe('formatRelativeTime', () => {
  it('collapses anything very recent to "just now"', () => {
    expect(formatRelativeTime(at(0), now)).toBe('just now')
    expect(formatRelativeTime(at(30_000), now)).toBe('just now')
  })

  it('steps up through the units', () => {
    expect(formatRelativeTime(at(5 * 60_000), now)).toMatch(/5 minutes ago/)
    expect(formatRelativeTime(at(3 * 3_600_000), now)).toMatch(/3 hours ago/)
    expect(formatRelativeTime(at(2 * 86_400_000), now)).toMatch(/2 days ago/)
    expect(formatRelativeTime(at(400 * 86_400_000), now)).toMatch(/year/)
  })

  it('uses friendly wording where the locale has it', () => {
    expect(formatRelativeTime(at(86_400_000), now)).toBe('yesterday')
  })

  it('does not throw on an unparseable timestamp', () => {
    expect(formatRelativeTime('not-a-date', now)).toBe('never')
  })
})
