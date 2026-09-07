/**
 * Plural category for a count, from the platform's CLDR rules.
 *
 * This is why `Intl.PluralRules` is worth reaching for instead of a ternary:
 * Russian has three forms and picks between them on the *last two digits*
 * (1 счёт, 2 счёта, 5 счётов, 21 счёт, 111 счётов). Any hand-written rule is
 * a bug waiting for a number ending in 1.
 */
const cache = new Map<string, Intl.PluralRules>()

export function pluralCategory(tag: string, count: number): Intl.LDMLPluralRule {
  let rules = cache.get(tag)
  if (!rules) {
    try {
      rules = new Intl.PluralRules(tag)
    } catch {
      rules = new Intl.PluralRules('en')
    }
    cache.set(tag, rules)
  }
  return rules.select(count)
}
