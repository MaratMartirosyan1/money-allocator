import type { Dictionary } from './en'

export const hy: Dictionary = {
  'app.name': 'Գումարի բաշխիչ',

  'nav.diagrams': 'Սխեմաներ',
  'nav.backTitle': 'Դեպի բոլոր սխեմաները',

  'common.untitled': 'Անանուն',
  'common.auto': 'ավտո',
  'common.open': 'Բացել',
  'common.duplicate': 'Կրկնօրինակել',
  'common.delete': 'Ջնջել',
  'common.newDiagram': '+ Նոր սխեմա',
  'common.addChild': '+ Ավելացնել ենթահանգույց',
  'common.tidyUp': 'Դասավորել',

  'theme.group': 'Տեսք',
  'theme.light': 'Լուսավոր',
  'theme.dark': 'Մուգ',
  'theme.system': 'Ինչպես համակարգում',

  'language.group': 'Լեզու',

  'topbar.diagramName': 'Սխեմայի անվանումը',
  'topbar.untitledDiagram': 'Անանուն սխեմա',
  'topbar.income': 'Եկամուտ',
  'topbar.monthlyIncome': 'Ամսական եկամուտ',
  'topbar.accountsNoun': { one: 'հաշիվ', other: 'հաշիվ' },
  'topbar.toSplit': 'բաշխելու',
  'topbar.hidePanels': 'Թաքցնել վահանակները',
  'topbar.showPanels': 'Ցուցադրել վահանակները',

  'list.title': 'Սխեմաներ',
  'list.subtitle':
    'Յուրաքանչյուր սխեմա ամսական եկամուտը բաշխելու եղանակ է։ Ամեն ինչ պահվում է հենց այս դիտարկիչում՝ առանց հաշվի, առանց սերվերի։',
  'list.emptyTitle': 'Դեռ սխեմաներ չկան',
  'list.emptyBody':
    'Ստեղծեք մեկը, որպեսզի պատկերեք՝ ուր է գնում ամսվա եկամուտը։',

  'card.nameOf': '{name} սխեմայի անվանումը',
  'card.noCategories': 'Դեռ կատեգորիաներ չկան',
  'card.more': '+{count} ևս',
  'card.accounts': { one: '{count} հաշիվ', other: '{count} հաշիվ' },
  'card.nodes': { one: '{count} հանգույց', other: '{count} հանգույց' },
  'card.savedEdited': 'Պահված է · խմբագրվել է {when}',
  'card.deleteConfirm': 'Ջնջե՞լ «{name}»-ը։ Այս գործողությունն անշրջելի է։',
  'card.duplicateOf': 'Կրկնօրինակել {name}',
  'card.deleteOf': 'Ջնջել {name}',

  'payouts.title': 'Վճարումներ',
  'payouts.accounts': { one: '{count} հաշիվ', other: '{count} հաշիվ' },
  'payouts.empty':
    'Վերևի հանգույցում նշեք ամսական եկամուտը՝ բաշխումը տեսնելու համար։',
  'payouts.unallocated': 'Չբաշխված',
  'payouts.under': '«{name}»-ի ներքո',
  'payouts.total': 'Ընդամենը',
  'payouts.mismatch':
    'Հաշվառվել է {total}՝ {income}-ից — սա սխալ է, խնդրում ենք հաղորդել այդ մասին։',

  'checks.title': 'Ստուգումներ',
  'checks.allGood': 'Ամեն ինչ ճիշտ է գումարվում։',
  'checks.toFix': '{count} ուղղելու',
  'checks.notes': { one: '{count} նշում', other: '{count} նշում' },
  'checks.absorb': 'Կլանել',
  'checks.goTo': 'Անցնել «{name}»',

  'node.nameLabel': 'Հանգույցի անվանումը',
  'node.rootNameLabel': 'Արմատային հանգույցի անվանումը',
  'node.incomePlaceholder': 'Եկամուտ',
  'node.delete': 'Ջնջել հանգույցը',
  'node.takesRemainder': 'Վերցնում է մնացորդը',
  'node.ofIncome': 'եկամտի {percent}-ը',
  'node.deleteSubtree': 'Ջնջե՞լ «{name}»-ը և ամեն ինչ նրա ներսում։',
  'node.thisNode': 'այս հանգույցը',

  'mode.group': 'Բաշխման ռեժիմ',
  'mode.percent': '%',
  'mode.fixed': 'Ֆիքս.',
  'mode.auto': 'Ավտո',
  'mode.percentTitle': 'Ծնող հանգույցի գումարի տոկոսը',
  'mode.fixedTitle': 'Ֆիքսված գումար, վերցվում է նախապես',
  'mode.autoTitle': 'Վերցնում է այն, ինչ թողել են հարևան հանգույցները',

  'value.share': 'Բաժին',
  'value.amount': 'Գումար',
  'value.free': '{count} ազատ',
  'value.freeTitle': 'Այս խմբում դեռ ազատ տոկոսային միավորները',
  'value.percentLabel': 'Տոկոսային բաժին',
  'value.fixedLabel': 'Ֆիքսված գումար',

  'meter.children': {
    one: '{count} ենթահանգույց',
    other: '{count} ենթահանգույց',
  },
  'meter.overAllocated': 'Գերբաշխված է {percent}-ով',
  'meter.unallocatedMoney': '{amount} չբաշխված',
  'meter.unallocatedPercent': '{percent} չբաշխված',
  'meter.full': 'Ամբողջովին բաշխված',
  'meter.allocated': '{percent} բաշխված',

  'badge.errors': { one: '{count} սխալ', other: '{count} սխալ' },
  'badge.warnings': { one: '{count} զգուշացում', other: '{count} զգուշացում' },

  'time.justNow': 'հենց հիմա',
  'time.never': 'երբեք',

  'issue.MISSING_ROOT': 'Այս սխեմայում արմատային հանգույց չկա։',
  'issue.PERCENT_SUM_EXCEEDS_100':
    '«{name}»-ի ենթահանգույցները գումարվում են {percent}%՝ հարևան հանգույցները չեն կարող գերազանցել 100%-ը։',
  'issue.MULTIPLE_AUTO_SIBLINGS':
    '«{name}»-ն ունի {count} ավտոմատ ենթահանգույց՝ մնացորդը հավասարապես բաշխվում է նրանց միջև։',
  'issue.FIXED_WITHOUT_AUTO_SIBLING':
    '«{name}»-ն ունի ֆիքսված ենթահանգույցներ, բայց ոչ ավտոմատ, ուստի մնացած գումարը գնալու տեղ չունի։',
  'issue.UNALLOCATED_REMAINDER':
    '«{name}»-ի ենթահանգույցները վերցնում են ընդամենը {percent}%՝ մնացած {remainder}%-ը մնում է չբաշխված։',
  'issue.INVALID_PERCENT': '«{name}»-ն ունի անվավեր տոկոս։',
  'issue.INVALID_FIXED': '«{name}»-ն ունի անվավեր ֆիքսված գումար։',
  'issue.DUPLICATE_SIBLING_NAME':
    '«{name}»-ի երկու ենթահանգույցն էլ կոչվում են «{otherName}»։',
  'issue.BROKEN_TREE': {
    one: '{count} հանգույց հասանելի չէ արմատից։',
    other: '{count} հանգույց հասանելի չէ արմատից։',
  },
  'issue.PERCENT_CLAMPED':
    'Ենթահանգույցները վերցնում են «{name}»-ի {percent}%-ը՝ գումարները կրճատվել են 100%-ի մեջ տեղավորվելու համար։',
  'issue.FIXED_EXCEEDS_AVAILABLE':
    '«{name}»-ի ֆիքսված գումարներին ավելին է պետք, քան առկա է՝ դրանք համամասնորեն կրճատվել են։',
  'issue.FIXED_EXCEEDS_NOTHING':
    '«{name}»-ի ֆիքսված գումարներին գումար է պետք, բայց առկա ոչինչ չկա՝ դրանք համամասնորեն կրճատվել են։',
  'issue.ZERO_ALLOCATION': '«{name}»-ն այս ամիս ոչինչ չի ստանում։',
}
