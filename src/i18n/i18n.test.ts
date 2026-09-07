import { describe, expect, it } from 'vitest'
import { translate } from '.'
import { en, type Message, type MessageKey } from './en'
import { hy } from './hy'
import { ru } from './ru'
import { LOCALES, detectLocale, isLocale, localeTag } from './locales'
import { issueMessage } from './issues'
import type { Issue } from '../domain/types'

const KEYS = Object.keys(en) as MessageKey[]

describe('the dictionaries', () => {
  it('cover every key in every locale', () => {
    for (const dict of [ru, hy]) {
      expect(Object.keys(dict).sort()).toEqual(KEYS.slice().sort())
    }
  })

  it('agree on which keys take plural forms', () => {
    for (const key of KEYS) {
      const plural = typeof en[key] !== 'string'
      expect([key, typeof ru[key] !== 'string']).toEqual([key, plural])
      expect([key, typeof hy[key] !== 'string']).toEqual([key, plural])
    }
  })

  it('leaves no placeholder unfilled in a translation', () => {
    // A `{name}` the English source uses but a translation drops would render
    // as a sentence missing its subject; the reverse renders a literal brace.
    const holders = (message: Message) => {
      const text =
        typeof message === 'string'
          ? message
          : Object.values(message).join(' ')
      return [...new Set(text.match(/\{(\w+)\}/g) ?? [])].sort().join(',')
    }

    for (const key of KEYS) {
      const source = holders(en[key])
      expect([key, holders(ru[key])]).toEqual([key, source])
      expect([key, holders(hy[key])]).toEqual([key, source])
    }
  })
})

describe('translate', () => {
  it('interpolates named params', () => {
    expect(translate('en', 'checks.goTo', { name: 'Charity' })).toBe(
      'Go to Charity',
    )
  })

  it('leaves an unknown placeholder alone rather than printing "undefined"', () => {
    expect(translate('en', 'checks.goTo', { other: 'x' })).toBe('Go to {name}')
  })

  it('picks English plurals on the one/other boundary', () => {
    expect(translate('en', 'card.nodes', { count: 1 })).toBe('1 node')
    expect(translate('en', 'card.nodes', { count: 4 })).toBe('4 nodes')
  })

  it('picks all three Russian plural forms', () => {
    // The reason `Intl.PluralRules` is used instead of `count === 1 ? a : b`:
    // Russian selects on the last two digits, so 21 is singular and 11 is not.
    expect(translate('ru', 'card.accounts', { count: 1 })).toBe('1 счёт')
    expect(translate('ru', 'card.accounts', { count: 3 })).toBe('3 счёта')
    expect(translate('ru', 'card.accounts', { count: 5 })).toBe('5 счётов')
    expect(translate('ru', 'card.accounts', { count: 11 })).toBe('11 счётов')
    expect(translate('ru', 'card.accounts', { count: 21 })).toBe('21 счёт')
  })

  it('formats interpolated numbers in the locale', () => {
    // Russian groups with a space, English with a comma.
    expect(translate('en', 'card.more', { count: 1234 })).toBe('+1,234 more')
    expect(translate('ru', 'card.more', { count: 1234 })).toMatch(/1\s234/)
  })

  it('translates the same key differently per locale', () => {
    const rendered = LOCALES.map((l) => translate(l.code, 'checks.allGood'))
    expect(new Set(rendered).size).toBe(LOCALES.length)
  })
})

describe('locale detection', () => {
  it('matches on the primary subtag', () => {
    expect(detectLocale(['hy-AM'])).toBe('hy')
    expect(detectLocale(['ru-RU', 'en'])).toBe('ru')
    expect(detectLocale(['en-GB'])).toBe('en')
  })

  it('falls back to English for a language we do not ship', () => {
    expect(detectLocale(['de-DE', 'fr'])).toBe('en')
    expect(detectLocale([])).toBe('en')
  })

  it('recognises its own codes and nothing else', () => {
    expect(isLocale('hy')).toBe(true)
    expect(isLocale('de')).toBe(false)
    expect(localeTag('ru')).toBe('ru')
  })
})

describe('issue messages', () => {
  const issue = (over: Partial<Issue> = {}): Issue => ({
    nodeId: 'n1',
    level: 'error',
    code: 'ZERO_ALLOCATION',
    params: { name: 'Charity' },
    ...over,
  })

  it('renders a code and its params as a sentence', () => {
    expect(issueMessage('en', issue())).toBe(
      '"Charity" receives nothing this month.',
    )
  })

  it('renders in the chosen language', () => {
    expect(issueMessage('ru', issue())).toBe(
      '«Charity» не получает ничего в этом месяце.',
    )
    expect(issueMessage('hy', issue())).toContain('Charity')
  })

  it('substitutes a localized "Untitled" for a blank name', () => {
    expect(issueMessage('en', issue({ params: { name: '' } }))).toBe(
      '"Untitled" receives nothing this month.',
    )
    expect(issueMessage('ru', issue({ params: { name: '' } }))).toContain(
      'Без названия',
    )
  })

  it('says "nothing available" only when nothing is available', () => {
    const short = (available: number) =>
      issueMessage(
        'en',
        issue({ code: 'FIXED_EXCEEDS_AVAILABLE', params: { name: 'Rent', available } }),
      )
    expect(short(0)).toContain('the nothing available')
    expect(short(500)).toContain('the amount available')
  })

  it('covers every issue code', () => {
    const codes: Issue['code'][] = [
      'PERCENT_SUM_EXCEEDS_100',
      'INVALID_PERCENT',
      'INVALID_FIXED',
      'MULTIPLE_AUTO_SIBLINGS',
      'UNALLOCATED_REMAINDER',
      'FIXED_WITHOUT_AUTO_SIBLING',
      'DUPLICATE_SIBLING_NAME',
      'MISSING_ROOT',
      'BROKEN_TREE',
      'FIXED_EXCEEDS_AVAILABLE',
      'PERCENT_CLAMPED',
      'ZERO_ALLOCATION',
    ]
    for (const code of codes) {
      for (const { code: locale } of LOCALES) {
        const text = issueMessage(locale, issue({ code, params: { name: 'X', count: 2 } }))
        expect([code, locale, text]).not.toContain('issue.')
        expect(text.length).toBeGreaterThan(0)
      }
    }
  })
})
