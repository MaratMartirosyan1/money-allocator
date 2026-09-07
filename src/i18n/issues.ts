import type { Issue } from '../domain/types'
import type { MessageKey } from './en'
import { translate, type MessageParams, type Translate } from '.'
import type { Locale } from './locales'

/**
 * Turns an engine issue into a sentence.
 *
 * The engine reports a code and structured params; picking words is this
 * layer's job. Two codes need a word chosen here rather than in the
 * dictionary, because the difference is a fact about the numbers:
 * `FIXED_EXCEEDS_AVAILABLE` reads differently when there is literally nothing
 * available, and an empty node name has to become the localized "Untitled"
 * before it lands inside quotes.
 */
export function issueKey(issue: Issue): MessageKey {
  if (issue.code === 'FIXED_EXCEEDS_AVAILABLE' && issue.params.available === 0) {
    return 'issue.FIXED_EXCEEDS_NOTHING'
  }
  return `issue.${issue.code}` as MessageKey
}

function issueParams(issue: Issue, untitled: string): MessageParams {
  const params: MessageParams = {}
  for (const [key, value] of Object.entries(issue.params)) {
    if (value === undefined) continue
    params[key] = value
  }
  // A blank name inside quotation marks reads as a typo, not as a blank field.
  if (params.name === '') params.name = untitled
  if (params.otherName === '') params.otherName = untitled
  return params
}

export function issueMessage(locale: Locale, issue: Issue): string {
  const untitled = translate(locale, 'common.untitled')
  return translate(locale, issueKey(issue), issueParams(issue, untitled))
}

/** The same thing for components that already hold a `t`. */
export function issueMessageWith(t: Translate, issue: Issue): string {
  return t(issueKey(issue), issueParams(issue, t('common.untitled')))
}
