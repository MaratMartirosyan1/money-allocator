/**
 * The canonical dictionary. Its keys *are* the key type, so `ru.ts` and
 * `hy.ts` cannot compile with a key missing or misspelled.
 *
 * A value is either a plain string or a set of plural forms keyed by CLDR
 * category; `translate` picks the form with `Intl.PluralRules`. Placeholders
 * are `{name}`-style and filled from the params object.
 */
export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & {
  other: string
}

export type Message = string | PluralForms

export const en = {
  'app.name': 'Money Allocator',

  'nav.diagrams': 'Diagrams',
  'nav.backTitle': 'Back to all diagrams',

  'common.untitled': 'Untitled',
  'common.auto': 'auto',
  'common.open': 'Open',
  'common.duplicate': 'Duplicate',
  'common.delete': 'Delete',
  'common.newDiagram': '+ New diagram',
  'common.addChild': '+ Add child',
  'common.tidyUp': 'Tidy up',

  'theme.group': 'Theme',
  'theme.light': 'Light',
  'theme.dark': 'Dark',
  'theme.system': 'Match system',

  'language.group': 'Language',

  'topbar.diagramName': 'Diagram name',
  'topbar.untitledDiagram': 'Untitled diagram',
  'topbar.income': 'Income',
  'topbar.monthlyIncome': 'Monthly income',
  'topbar.accountsNoun': { one: 'account', other: 'accounts' },
  'topbar.toSplit': 'to split',
  'topbar.hidePanels': 'Hide panels',
  'topbar.showPanels': 'Show panels',

  'list.title': 'Diagrams',
  'list.subtitle':
    'Each diagram is a way of splitting your monthly income. Everything is saved in this browser as you edit — no account, no server.',
  'list.emptyTitle': 'No diagrams yet',
  'list.emptyBody': 'Create one to map out where each month’s income goes.',

  'card.nameOf': 'Name of {name}',
  'card.noCategories': 'No categories yet',
  'card.more': '+{count} more',
  'card.accounts': { one: '{count} account', other: '{count} accounts' },
  'card.nodes': { one: '{count} node', other: '{count} nodes' },
  'card.savedEdited': 'Saved · edited {when}',
  'card.deleteConfirm': 'Delete "{name}"? This cannot be undone.',
  'card.duplicateOf': 'Duplicate {name}',
  'card.deleteOf': 'Delete {name}',

  'payouts.title': 'Payouts',
  'payouts.accounts': { one: '{count} account', other: '{count} accounts' },
  'payouts.empty': 'Enter a monthly income on the top node to see the split.',
  'payouts.unallocated': 'Unallocated',
  'payouts.under': 'under {name}',
  'payouts.total': 'Total',
  'payouts.mismatch':
    'Accounted for {total} of {income} — this is a bug, please report it.',

  'checks.title': 'Checks',
  'checks.allGood': 'Everything adds up.',
  'checks.toFix': '{count} to fix',
  'checks.notes': { one: '{count} note', other: '{count} notes' },
  'checks.absorb': 'Absorb it',
  'checks.goTo': 'Go to {name}',

  'node.nameLabel': 'Node name',
  'node.rootNameLabel': 'Root node name',
  'node.incomePlaceholder': 'Income',
  'node.delete': 'Delete node',
  'node.takesRemainder': 'Takes the remainder',
  'node.ofIncome': '{percent} of income',
  'node.deleteSubtree': 'Delete {name} and everything under it?',
  'node.thisNode': 'this node',

  'mode.group': 'Allocation mode',
  'mode.percent': '%',
  'mode.fixed': 'Fixed',
  'mode.auto': 'Auto',
  'mode.percentTitle': 'A percentage of the parent amount',
  'mode.fixedTitle': 'A fixed amount, taken off the top',
  'mode.autoTitle': 'Takes whatever the siblings leave over',

  'value.share': 'Share',
  'value.amount': 'Amount',
  'value.free': '{count} free',
  'value.freeTitle': 'Percentage points still free in this group',
  'value.percentLabel': 'Percentage share',
  'value.fixedLabel': 'Fixed amount',

  'meter.children': { one: '{count} child', other: '{count} children' },
  'meter.overAllocated': 'Over-allocated by {percent}',
  'meter.unallocatedMoney': '{amount} unallocated',
  'meter.unallocatedPercent': '{percent} unallocated',
  'meter.full': 'Fully allocated',
  'meter.allocated': '{percent} allocated',

  'badge.errors': { one: '{count} error', other: '{count} errors' },
  'badge.warnings': { one: '{count} warning', other: '{count} warnings' },

  'time.justNow': 'just now',
  'time.never': 'never',

  'issue.MISSING_ROOT': 'This system has no root node.',
  'issue.PERCENT_SUM_EXCEEDS_100':
    'Children of "{name}" add up to {percent}% — siblings cannot exceed 100%.',
  'issue.MULTIPLE_AUTO_SIBLINGS':
    '"{name}" has {count} automatic children — the remainder is split evenly between them.',
  'issue.FIXED_WITHOUT_AUTO_SIBLING':
    '"{name}" has fixed children but no automatic one, so leftover money has nowhere to go.',
  'issue.UNALLOCATED_REMAINDER':
    'Children of "{name}" claim only {percent}% — the remaining {remainder}% stays unallocated.',
  'issue.INVALID_PERCENT': '"{name}" has an invalid percentage.',
  'issue.INVALID_FIXED': '"{name}" has an invalid fixed amount.',
  'issue.DUPLICATE_SIBLING_NAME':
    'Two children of "{name}" are both called "{otherName}".',
  'issue.BROKEN_TREE': {
    one: '{count} node is not reachable from the root.',
    other: '{count} nodes are not reachable from the root.',
  },
  'issue.PERCENT_CLAMPED':
    'Children claim {percent}% of "{name}" — amounts were scaled down to fit 100%.',
  'issue.FIXED_EXCEEDS_AVAILABLE':
    'Fixed amounts under "{name}" need more than the amount available — they were reduced proportionally.',
  'issue.FIXED_EXCEEDS_NOTHING':
    'Fixed amounts under "{name}" need more than the nothing available — they were reduced proportionally.',
  'issue.ZERO_ALLOCATION': '"{name}" receives nothing this month.',
} satisfies Record<string, Message>

export type MessageKey = keyof typeof en

/** Every locale must supply every key — a gap is a type error, not a fallback. */
export type Dictionary = Record<MessageKey, Message>
