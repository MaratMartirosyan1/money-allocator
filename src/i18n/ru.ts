import type { Dictionary } from './en'

export const ru: Dictionary = {
  'app.name': 'Распределитель денег',

  'nav.diagrams': 'Схемы',
  'nav.backTitle': 'Ко всем схемам',

  'common.untitled': 'Без названия',
  'common.auto': 'авто',
  'common.open': 'Открыть',
  'common.duplicate': 'Дублировать',
  'common.delete': 'Удалить',
  'common.newDiagram': '+ Новая схема',
  'common.addChild': '+ Добавить узел',
  'common.tidyUp': 'Выровнять',

  'theme.group': 'Тема',
  'theme.light': 'Светлая',
  'theme.dark': 'Тёмная',
  'theme.system': 'Как в системе',

  'language.group': 'Язык',

  'settings.title': 'Настройки',

  'topbar.diagramName': 'Название схемы',
  'topbar.untitledDiagram': 'Схема без названия',
  'topbar.income': 'Доход',
  'topbar.monthlyIncome': 'Месячный доход',
  'topbar.accountsNoun': {
    one: 'счёт',
    few: 'счёта',
    many: 'счётов',
    other: 'счёта',
  },
  'topbar.toSplit': 'к распределению',
  'topbar.hidePanels': 'Скрыть панели',
  'topbar.showPanels': 'Показать панели',

  'list.title': 'Схемы',
  'list.subtitle':
    'Каждая схема — это способ распределить месячный доход. Всё сохраняется в этом браузере по мере правок: без аккаунта и без сервера.',
  'list.emptyTitle': 'Схем пока нет',
  'list.emptyBody':
    'Создайте схему, чтобы расписать, куда уходит доход каждого месяца.',

  'card.nameOf': 'Название схемы {name}',
  'card.noCategories': 'Категорий пока нет',
  'card.more': '+{count} ещё',
  'card.accounts': {
    one: '{count} счёт',
    few: '{count} счёта',
    many: '{count} счётов',
    other: '{count} счёта',
  },
  'card.nodes': {
    one: '{count} узел',
    few: '{count} узла',
    many: '{count} узлов',
    other: '{count} узла',
  },
  'card.savedEdited': 'Сохранено · изменено {when}',
  'card.deleteConfirm': 'Удалить «{name}»? Это действие необратимо.',
  'card.duplicateOf': 'Дублировать {name}',
  'card.deleteOf': 'Удалить {name}',

  'payouts.title': 'Выплаты',
  'payouts.accounts': {
    one: '{count} счёт',
    few: '{count} счёта',
    many: '{count} счётов',
    other: '{count} счёта',
  },
  'payouts.empty':
    'Укажите месячный доход в верхнем узле, чтобы увидеть распределение.',
  'payouts.unallocated': 'Не распределено',
  'payouts.under': 'в «{name}»',
  'payouts.total': 'Итого',
  'payouts.mismatch':
    'Учтено {total} из {income} — это ошибка, пожалуйста, сообщите о ней.',

  'checks.title': 'Проверки',
  'checks.allGood': 'Всё сходится.',
  'checks.toFix': '{count} к исправлению',
  'checks.notes': {
    one: '{count} замечание',
    few: '{count} замечания',
    many: '{count} замечаний',
    other: '{count} замечания',
  },
  'checks.absorb': 'Поглотить',
  'checks.goTo': 'Перейти к «{name}»',

  'node.nameLabel': 'Название узла',
  'node.rootNameLabel': 'Название корневого узла',
  'node.incomePlaceholder': 'Доход',
  'node.delete': 'Удалить узел',
  'node.takesRemainder': 'Забирает остаток',
  'node.ofIncome': '{percent} от дохода',
  'node.deleteSubtree': 'Удалить «{name}» и всё, что внутри?',
  'node.thisNode': 'этот узел',

  'mode.group': 'Режим распределения',
  'mode.percent': '%',
  'mode.fixed': 'Фикс.',
  'mode.auto': 'Авто',
  'mode.percentTitle': 'Процент от суммы родителя',
  'mode.fixedTitle': 'Фиксированная сумма, снимается сверху',
  'mode.autoTitle': 'Забирает всё, что оставили соседи',

  'value.share': 'Доля',
  'value.amount': 'Сумма',
  'value.free': '{count} свободно',
  'value.freeTitle': 'Сколько процентных пунктов ещё свободно в этой группе',
  'value.percentLabel': 'Процентная доля',
  'value.fixedLabel': 'Фиксированная сумма',

  'meter.children': {
    one: '{count} потомок',
    few: '{count} потомка',
    many: '{count} потомков',
    other: '{count} потомка',
  },
  'meter.overAllocated': 'Перерасход на {percent}',
  'meter.unallocatedMoney': '{amount} не распределено',
  'meter.unallocatedPercent': '{percent} не распределено',
  'meter.full': 'Распределено полностью',
  'meter.allocated': '{percent} распределено',

  'badge.errors': {
    one: '{count} ошибка',
    few: '{count} ошибки',
    many: '{count} ошибок',
    other: '{count} ошибки',
  },
  'badge.warnings': {
    one: '{count} предупреждение',
    few: '{count} предупреждения',
    many: '{count} предупреждений',
    other: '{count} предупреждения',
  },

  'time.justNow': 'только что',
  'time.never': 'никогда',

  'issue.MISSING_ROOT': 'У этой схемы нет корневого узла.',
  'issue.PERCENT_SUM_EXCEEDS_100':
    'Потомки «{name}» дают в сумме {percent}% — соседние узлы не могут превышать 100%.',
  'issue.MULTIPLE_AUTO_SIBLINGS':
    'У «{name}» {count} автоматических потомков — остаток делится между ними поровну.',
  'issue.FIXED_WITHOUT_AUTO_SIBLING':
    'У «{name}» есть фиксированные потомки, но нет автоматического, поэтому остатку некуда деться.',
  'issue.UNALLOCATED_REMAINDER':
    'Потомки «{name}» забирают только {percent}% — оставшиеся {remainder}% не распределены.',
  'issue.INVALID_PERCENT': 'У «{name}» недопустимый процент.',
  'issue.INVALID_FIXED': 'У «{name}» недопустимая фиксированная сумма.',
  'issue.DUPLICATE_SIBLING_NAME':
    'Два потомка «{name}» называются одинаково: «{otherName}».',
  'issue.BROKEN_TREE': {
    one: '{count} узел недостижим из корня.',
    few: '{count} узла недостижимы из корня.',
    many: '{count} узлов недостижимы из корня.',
    other: '{count} узла недостижимы из корня.',
  },
  'issue.PERCENT_CLAMPED':
    'Потомки забирают {percent}% от «{name}» — суммы уменьшены, чтобы уложиться в 100%.',
  'issue.FIXED_EXCEEDS_AVAILABLE':
    'Фиксированным суммам в «{name}» нужно больше, чем доступно — они уменьшены пропорционально.',
  'issue.FIXED_EXCEEDS_NOTHING':
    'Фиксированным суммам в «{name}» нужны деньги, но доступного нет — они уменьшены пропорционально.',
  'issue.ZERO_ALLOCATION': '«{name}» не получает ничего в этом месяце.',
}
