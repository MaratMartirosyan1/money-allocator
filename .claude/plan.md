# Money Allocator — Implementation Plan

A tree-based monthly income allocator. The user builds a diagram of nodes once
(root = income, children = accounts/categories), configures how each node takes
its share, and then every month enters the income at the top and reads off how
much each account receives.

## Status

Phases 0–5 are **implemented** — the engine, the store, the canvas, live
calculation and the validation UX — plus draggable nodes, a collapsible
sidebar, a theme toggle, and most of phase 6 (diagram management, now split
across a list page and an editor page). Phases 8–10 (mobile layout,
three-language UI, seeded starter diagrams) are implemented on top.

Still open: JSON export/import (phase 6) and all of phase 7.

## Locked decisions

| Decision | Choice |
|---|---|
| Language | TypeScript (convert the Vite JS template) |
| Diagram | `@xyflow/react` (React Flow); own tidy-tree layout (see note) |
| State | `zustand` + `persist` middleware (localStorage) |
| Tests | `vitest` + `@testing-library/react` |
| v1 scope | Phases 0–5 (single system, auto-saved) |
| i18n | Hand-rolled dictionaries + `Intl.PluralRules`; no i18n library |
| Locales | `en`, `ru`, `hy` — English is the key-defining dictionary |
| Mobile | CSS-only breakpoints; the side panel becomes a bottom sheet |
| Seeds | Fixed-id starter diagrams, re-asserted into `localStorage` on boot |

Dependencies: `@xyflow/react`, `zustand`
Dev: `typescript`, `@types/*`, `vitest`, `@testing-library/react`

Deliberately **not** used: money library (`dinero.js`/`big.js`) — integer minor
units + `Intl.NumberFormat` instead; ID library — `crypto.randomUUID()`;
`react-hook-form` — fields are 2–3 inline inputs per node; UI kit — plain CSS;
router — v1 has one system. `zod` enters only with phase 6 (JSON import).

---

## 1. Allocation semantics

This is the core of the product and the source of every subtle bug. Pin it down
before writing UI.

### Node modes

Every non-root node has exactly one mode:

- **`percent`** — takes a share of its **parent's** amount.
- **`fixed`** — takes an absolute amount (e.g. 300,000 AMD).
- **`auto`** (remainder) — absorbs whatever its siblings left over. Its
  percentage is *derived and displayed*, never entered.

### Resolution order inside a sibling group

Given a parent holding `A`:

1. **`percent` children first** — each takes `A × p / 100`. Percentages are
   always of the parent's **full** amount, never of what remains after fixed
   siblings. This is the intuitive reading and keeps a node's percentage stable
   when a fixed sibling's amount changes.
2. **`fixed` children next** — each takes its literal amount out of
   `A − percentTotal`.
3. **`auto` children last** — split whatever is left, equally.

Worked example (`A = 1,000,000`, children `10%`, `fixed 300,000`, `auto`):

```
10%            → 100,000
fixed          → 300,000
auto           → 600,000   (badge displays 60%)
```

### Constraints, split by when they are checkable

The critical distinction: percentage errors are structural, fixed-amount errors
are **income-dependent**. A config can be perfectly valid and still break at a
low income.

| Rule | Level | Checkable |
|---|---|---|
| sibling `percent` sum ≤ 100 | error | config time (static) |
| percent sum < 100 and no `auto` sibling → money stranded | warning | config time |
| more than one `auto` child in a group | warning (split equally) | config time |
| duplicate names among siblings | warning | config time |
| `fixed` amount exceeds available money | **error** | **run time only** |
| a node resolves to 0 | warning | run time |

`fixed 300,000` under a node that only receives `160,000` this month is a
runtime deficit, not a config bug. The engine must **clamp to available, zero
the `auto` sibling, and report the issue** — never emit a negative amount.

### Derived percentage on `auto` nodes

- Siblings are all `percent` → the auto node's share is static (`100 − sum`) and
  can be shown before any income is entered.
- Any `fixed` sibling exists → the share is income-dependent. Render `—` until
  income is set.

### Rounding

Money is stored as **integer minor units** (`currencyDecimals: 0` for AMD).
Distribution uses **largest-remainder**, ties broken in `childIds` declaration
order. Floats silently leak drams: three children at 33.33 / 33.33 / 33.34 of
100,000 must total exactly 100,000, at every level.

**Invariant asserted in tests:** `sum(children) + unallocated === parent`,
exactly, at every node.

---

## 2. Data model

```ts
type Mode = 'percent' | 'fixed' | 'auto'

interface AllocNode {
  id: string
  name: string             // "Charity", "Spendings"
  parentId: string | null
  childIds: string[]       // ordered — drives rounding tie-breaks
  mode: Mode               // ignored on root
  value: number            // percent 0–100 | minor units | unused for 'auto'
}

interface AllocationSystem {
  id: string
  name: string
  currency: string         // 'AMD'
  currencyDecimals: number // 0 for AMD
  schemaVersion: 1
  rootId: string
  nodes: Record<string, AllocNode>   // normalized flat map
  createdAt: string
  updatedAt: string
}
```

**Normalized flat map, not a nested tree.** Updates become single-key writes (no
immer, no deep-clone recursion), React Flow consumes a flat node list anyway,
and `childIds` carries ordering.

### Engine contract

One pure function, no React, no store access:

```ts
computeAllocation(system: AllocationSystem, income: number) => {
  amounts:         Record<NodeId, number>   // minor units
  percentOfParent: Record<NodeId, number>   // feeds the 'auto' badge
  percentOfIncome: Record<NodeId, number>
  unallocated:     Record<NodeId, number>   // stranded money, per parent
  issues:          Issue[]                  // { nodeId, level, code, message }
  payouts:         { nodeId, name, amount }[]  // leaves = the accounts
}
```

Keeping this pure and rendering-agnostic is what makes the view layer swappable
and the math exhaustively testable.

---

## 3. Phases

### Phase 0 — Setup ✅
Convert template to TypeScript, install deps, wire vitest, strip the demo
`App.jsx` / `App.css` boilerplate and unused assets.

### Phase 1 — Domain engine (pure, no React) ✅
- `domain/types.ts` — model + `Issue` codes
- `domain/money.ts` — parse / format / `Intl.NumberFormat` for AMD
- `domain/rounding.ts` — largest-remainder distribution
- `domain/engine.ts` — `computeAllocation`, single DFS from root
- `domain/validate.ts` — static (income-independent) checks

**Test cases, written from the original requirements:**

1. `10% / 10% / auto` of 1,000,000 → 100k / 100k / 800k; auto badge reads 80%.
2. That 800k node gains `fixed 300,000` + `auto` → 300k / 500k; auto reads 62.5%.
3. Income → 400,000: node3 = 320k, fixed = 300k, auto = 20k.
4. Income → 200,000: node3 = 160k, **fixed clamps to 160k**, auto = 0, error raised.
5. `33.33 / 33.33 / 33.34` of 100,000 totals exactly 100,000.
6. Deep-nesting conservation invariant holds at every node.
7. Income = 0 → all zeros, static percentages still render.
8. Percent sum < 100 with no `auto` sibling → `unallocated` recorded on parent.

Fully testable with zero UI. This is where the risk lives — spend the care here.

### Phase 2 — Store ✅
Zustand slice: `systems`, `activeSystemId`, `income`. Actions: `addChild`,
`updateNode`, `setMode`, `removeNode` (cascade delete + confirm), `moveNode`,
`reorderSibling`, `setIncome`. Enable `persist` immediately so nothing is ever
lost. Memoized selectors call the engine.

### Phase 3 — Canvas + node editing ✅
React Flow wrapper; `layout/treeLayout.ts` places nodes and merges in any
manual positions the user has dragged. Custom node components: root (income
input) and allocation node (name field, `% | fixed | auto` segmented toggle,
value input, add-child, delete).

**Dagre was dropped after phase 3.** Its crossing-minimization pass reorders
siblings within a rank, emitting them in reverse insertion order, so every
newly added child landed leftmost — with no supported way to pin the order.
`layout/tidyTree.ts` replaces it: because the graph is always a strict tree, a
direct layout guarantees `childIds` order left to right by construction, and
proves non-overlap (each node stays inside its own subtree's span, and sibling
spans are disjoint). Nodes are draggable, positions persist on the system, and
**Tidy up** clears them.

Known friction point: inline inputs need `nodrag` / `nowheel` classNames so
React Flow does not swallow keyboard and wheel events.

### Phase 4 — Live calculation ✅
Income bar pinned at top. Every node renders its computed amount, its % of
parent, and its % of income. `auto` nodes show the derived percentage badge.
`PayoutSummary` table lists leaf accounts → amounts — the "how much does each
account get this month" answer.

### Phase 5 — Validation UX ✅
Per-sibling-group allocation bar (`100% ✓` / `110% ✗`). Error and warning badges
on nodes plus a collapsible issue list. Guardrails: clamp percent input to the
group's remaining headroom; when a node is switched to `fixed` inside an
all-percent group, offer to convert a sibling to `auto` so the leftover has
somewhere to go.

### Phase 6 — Systems management ✅ (partly)
Create / rename / duplicate / delete / switch diagrams, from a dropdown on the
title. All of it persisted to `localStorage` through the store's existing
`persist`, so there is no save step. Duplicates are deep copies; node ids are
carried over unchanged because they are only ever resolved within their own
system. The last diagram cannot be deleted — the canvas has no empty state.

Income stays global rather than per diagram, so one figure can be compared
across strategies.

Later reworked into two real pages with React Router — `/` lists the diagrams,
`/d/:id` edits one — replacing the dropdown. The URL owning the open diagram
means shareable links, working browser-back, and refresh-in-place; the editor
pushes the route param into the store in a layout effect so the store actions
keep operating on "the open diagram" without a painted mismatch. With a list
page there is finally somewhere for an empty state to live, so the "last
diagram cannot be deleted" guard was dropped.

**Still deferred:** JSON export and import validated by `zod`, with a
`schemaVersion` migration hook.

A light/dark/system theme toggle also landed here: tokens are defined once for
light, then re-declared under both `prefers-color-scheme` (guarded so an
explicit light choice wins) and `[data-theme='dark']`. An inline script in
`index.html` applies a saved dark theme before React mounts to avoid a flash.

### Phase 7 — Nice-to-haves
Monthly run history (month + income + payout snapshot, kept per month); Sankey
view of the money flow (`@nivo/sankey` or `d3-sankey`); drag-to-reparent;
starter templates (50/30/20); CSV export.

### Phase 8 — Mobile ✅

The tool has to be usable on a phone, not merely not-broken on one. Reference
viewports, in CSS pixels (the only unit that matters — device pixel ratio is
irrelevant to layout):

| Device | CSS viewport | Why it is in the list |
|---|---|---|
| Galaxy Z Fold, folded | **344 × 882** | the narrowest screen anyone will open this on |
| Galaxy S23 / S24 | 360 × 780 | the most common Android width |
| iPhone 16 Pro | 402 × 874 | notch + home indicator → safe-area insets |
| Pixel 8 / 9 | 412 × 915 | tallest of the common phones |
| Galaxy Z Fold, unfolded | ~768 × 830 | tablet-shaped and *short*; not a big phone |

So three breakpoints, not one: **≤ 900px** (unfolded fold / tablet — the side
panel stops being a column), **≤ 640px** (phone — the top bar reflows), and
**≤ 380px** (folded fold — the tightest padding and type). 344px is the number
every layout is checked against.

Decisions that follow from the device list:

- **`dvh`, not `vh`.** Mobile Safari and Chrome shrink the viewport as their
  toolbars slide away; `100vh` is the *largest* height, so a `100vh` app shell
  is permanently taller than the visible area and the top bar scrolls off.
  `height: 100dvh` with a `100%` fallback.
- **Safe-area insets.** `viewport-fit=cover` in the viewport meta, then
  `env(safe-area-inset-*)` padding on the top bar, the list page and the
  bottom sheet, so the iPhone's notch and home indicator never sit on a
  control.
- **The side panel becomes a bottom sheet.** Below 900px it leaves the flex
  row and is absolutely positioned against the bottom of the canvas, capped at
  `min(72dvh, 520px)`, sliding up over it. The canvas keeps the full screen,
  which is the scarce resource. The panel stays mounted and keeps its `inert`
  when closed — so it slides rather than popping, its scroll position
  survives, and the existing hamburger and its `aria-controls` wiring carry
  over unchanged. A grab bar is added for dismissal by thumb; it is
  `aria-hidden`, being a redundant affordance for a hamburger that already
  announces the same action.
- **16px inputs, or iOS zooms.** Safari auto-zooms any focused input with a
  computed font-size under 16px and does not zoom back out. Every input goes
  to 16px under `(pointer: coarse)`.
- **Taller cards on touch, in the layout too.** That font bump grows the node
  cards, and the tidy-tree layout *estimates* card heights rather than
  measuring them — so the estimate has to know. `layoutTree` takes a
  `NodeMetrics` argument (`DESKTOP_METRICS` / `TOUCH_METRICS`); the canvas
  picks one via `useLayoutMetrics()`, which watches `(pointer: coarse)`. Get
  this wrong and ranks overlap on phones only.
- **Node cards keep their 248px width.** The canvas is zoomable, so shrinking
  the cards buys nothing and would desync the layout constant. `fitView` does
  the work instead, with a lower `minZoom` so a wide tree still fits on 344px.
- **The minimap goes.** It costs a quarter of a 402px screen to show a picture
  of what is already on screen. Hidden below 900px.
- **44px tap targets** under `(pointer: coarse)` — the node delete `×` is 22px
  on desktop, which is a coin-flip with a thumb.
- **The top bar's line breaks are stated, not left to `flex-wrap`**, because
  otherwise where it breaks depends on the length of the diagram name and the
  number of digits in the income — which is how a bar ends up fine in English
  and broken in Armenian. Line one is the diagram name; line two is the
  income, its readout and the controls; below 380px the controls take a third
  line of their own. The groups are wrapped in `display: contents` elements,
  so on desktop the bar is still one flat flex row and **no `order` override
  is needed anywhere** — visual order and DOM order stay the same order, which
  is the one a keyboard follows.
- **The group meter's caption gets a fixed two-line box.** Its height feeds the
  layout estimate, and Russian and Armenian run 20–30% longer than English, so
  whether it wraps is language-dependent. Pinning the box keeps the estimate
  true in every language rather than only in the one it was measured in.

React Flow's own touch handling (drag to pan, pinch to zoom) needs nothing
adding; the work is entirely in making the chrome around it fit.

### Phase 9 — Multilingual: Armenian, Russian, English ✅

Hand-rolled, ~200 lines, no dependency. `react-i18next` brings a loader, a
namespace system and a suspense boundary to solve problems this app does not
have: every string is known at build time and there are three of them per key.

```
src/i18n/
  locales.ts   Locale union + native labels ('English' / 'Русский' / 'Հայերեն')
  en.ts        the canonical dictionary — its keys ARE the key type
  ru.ts hy.ts  typed `Dictionary`, so a missing key is a compile error
  plural.ts    Intl.PluralRules wrapper
  index.ts     translate() / useT()
  format.ts    useFormat() — locale-bound money, percent, relative time
  issues.ts    Issue code + params → a sentence
```

Three things make this more than a lookup table:

- **Russian needs three plural forms** (1 счёт / 2 счёта / 5 счётов), Armenian
  two, English two. So a dictionary value is `string | PluralForms`, and
  `t(key, { count })` selects the form through `Intl.PluralRules(locale)` —
  the correct rule for every locale, from the platform, for free. Hand-written
  `count === 1 ? a : b` is simply wrong in Russian.
- **The domain layer stops emitting English.** `Issue` carried a
  pre-formatted `message`, which put user-facing prose inside a pure engine.
  It now carries `code` + structured `params`, and `i18n/issues.ts` renders
  the sentence. This is the change the plan should have wanted anyway: the
  engine is supposed to be rendering-agnostic, and a translated message proves
  it. The English wording is preserved word for word, so the existing
  assertions still hold.
- **Numbers are locale-formatted too.** `Intl.NumberFormat` was being called
  with `undefined` — the *browser's* locale, not the app's. The domain
  formatters now take an explicit locale tag and `useFormat()` binds them to
  the active one, so Armenian gets `1 000 000 ֏` and English `֏1,000,000`.
  `parsePercentInput` accordingly accepts a decimal comma, which is what a
  Russian or Armenian keyboard produces.

The chosen locale is persisted with the theme, reflected onto `<html lang>`,
and defaults from `navigator.language` on a first visit. Each option in the
switcher is labelled in its own language — someone who has landed on the wrong
one cannot read the others.

Two dictionary-wide invariants are asserted in tests rather than trusted: every
locale defines every key (also a compile error, via `Dictionary`), and every
translation of a message uses exactly the placeholders its English source does
— a dropped `{name}` renders a sentence with no subject, an added one renders a
literal brace.

### Phase 9a — Settings behind one gear ✅

Language and theme first shipped as two permanently visible segmented controls
in the header. That is the wrong trade: both are set once and never revisited,
and together they cost ~240px — which on a 344px phone is a whole row of the
top bar, spent on decisions nobody is making.

So: one gear, one popover, two labelled groups. It gives that row back (the
income and its readout now share a line with the controls) and drops the
header to a single 32px button on desktop.

The popover is deliberately **non-modal** — it dims nothing and traps nothing,
because it holds two three-way choices, not a task. It still owes the rest of
the contract, which is where the work actually is:

- `aria-expanded` / `aria-haspopup="dialog"` / `aria-controls` on the trigger,
  `role="dialog"` plus a name on the panel.
- **Escape closes and returns focus to the gear**; an outside *click* closes
  but leaves focus where the user put it. Those are different gestures and
  deserve different answers.
- Focus moves into the panel on open, so its name is announced and the next
  Tab lands on the first control rather than back out in the bar.
- **Picking a setting does not close it.** Two settings behind one trigger
  means closing on the first pick would charge another round trip for the
  second.
- The visible caption *is* each group's accessible name (`aria-labelledby`),
  rather than a second copy of it sitting beside the group's own `aria-label`.

The one non-obvious consequence is in the tests: the pickers are no longer on
screen at render, so every test that reaches for them goes through an
`openSettings(user)` helper first — and a test that switches to Russian
mid-flight has to stop calling the popover "Settings".

### Phase 6a — The whole card opens the diagram ✅

The list card had an invisible button stretched behind its content, which
meant only the *gaps between the text* opened it: the card looked interactive,
then ignored you whenever you happened to aim at a word. Worse as a card gets
fuller, and worst on a phone, where the gaps are the thing thumbs miss.

Replaced with the stretched-link pattern — a `::after` on the **Open** link,
`inset: 0` against the card. The behaviour is what a click handler on the
`<li>` would give, but it stays a *link*: cmd-click opens a new tab,
right-click offers "Open link in new tab", the status bar shows the
destination, and the keyboard path is a real anchor rather than a list item
impersonating one. Comparing two allocations side by side is a stated use for
this app, so those are not incidental.

Two constraints come with it. Nothing between the link and `.card` may be
positioned, or `inset: 0` resolves against that element instead of the card —
so the old blanket `.card > * { position: relative }` had to go, and only the
parts that must stay above the overlay (the name field, duplicate, delete) are
raised. And the summary text underneath is no longer selectable, which is the
trade the pattern makes and is the right way round here.

**Not directly testable:** jsdom does no layout, so an overlay intercepts
nothing there and "click the card body" cannot be expressed. The tests assert
what remains real — that the mechanism is a link with the right `href` and the
overlay class, and that the name field and the two buttons still do their own
jobs rather than opening the card.

### Phase 10 — Seeded starter diagrams ✅

Four real allocation diagrams ship with the app, so a new browser opens onto
something worth looking at rather than the generic `starterSystem()`.

- `domain/seeds.data.ts` holds them verbatim, **with their original ids**. A
  fixed id is the whole mechanism: it is what lets a later release recognise a
  seed the user already has, instead of adding a fifth copy every boot.
- `domain/seeds.ts` applies them: any seed id missing from `systems` is
  inserted and appended to `systemOrder`; if the stored `seedVersion` is older
  than `SEED_VERSION`, every seed is rewritten from the data file. Bumping
  `SEED_VERSION` is therefore how a corrected seed reaches people who already
  have the old one — and it deliberately overwrites their edits to *those four
  diagrams only*, which is why it is a manual bump and not derived from a
  content hash.
- Seeding runs in two places, because there are two ways in: the persist
  `merge` (a returning browser) and `createInitialState` (a first visit, or
  storage that failed to parse). Both funnel through the same `applySeeds`.
- The user's own diagrams are never touched, and `systemOrder` keeps seeds
  ahead of them.
- The seeds are a straight copy of one user's `localStorage`, so
  `scripts/import-seeds.mjs` regenerates the data file from a dumped blob
  rather than anyone editing 300 lines of JSON by hand. It also refuses to
  write a tree the engine could not walk — a `childIds` entry pointing at
  nothing, or a root that is not in `nodes` — which is exactly the mistake
  hand-transcription makes.
- Tests treat the seed data as data under test, not as fixtures: every seed
  must be a well-formed tree, must raise no configuration *errors*, and must
  conserve money at every node.

**Consequence worth stating plainly:** because the rule is "always ensure
present", deleting a seeded diagram is not permanent — it comes back on the
next load. Making deletion stick would mean recording tombstones
(`dismissedSeedIds`) and checking them before inserting; the hook for that is
one `if` inside `applySeeds`.

---

## 4. Structure

```
src/
  domain/      types.ts money.ts rounding.ts engine.ts validate.ts (+ .test.ts)
               seeds.ts seeds.data.ts
  store/       useSystemStore.ts selectors.ts
  i18n/        locales.ts en.ts ru.ts hy.ts plural.ts index.ts format.ts issues.ts
  layout/      treeLayout.ts
  components/  AllocatorCanvas.tsx SettingsMenu.tsx LocaleToggle.tsx
               nodes/RootNode.tsx nodes/AllocationNode.tsx
               IncomeBar.tsx PayoutSummary.tsx IssueList.tsx
  App.tsx
scripts/       import-seeds.mjs
```

---

## Summary

Build a **pure allocation engine plus a thin view**. The engine is a single DFS
over a normalized node map that resolves each sibling group in a fixed order —
percentages of the parent's full amount, then fixed amounts, then `auto` nodes
absorbing the remainder — using integer minor units and largest-remainder
rounding so children always sum exactly to their parent. Percentage
over-allocation is a config-time error; a `fixed` amount outrunning the
available money is a run-time one that clamps and reports instead of going
negative. TypeScript, React Flow (own tidy-tree layout), zustand with persist,
vitest. Phases
1–2 (engine and store, fully tested) land before any UI, because the math is the
risk, not the rendering.

On top of that: the UI is **fully usable on a phone** — three breakpoints down
to the 344px folded Galaxy Z Fold, `dvh` heights, safe-area insets, a bottom
sheet instead of a side column, and a layout that knows its cards get taller
when inputs go to 16px for iOS. It speaks **English, Russian and Armenian**
through hand-rolled dictionaries with real `Intl.PluralRules` plurals, which
forced the engine to stop emitting English prose and start emitting issue
codes plus params; language and theme live together behind **one gear** rather
than two permanent banners, in a non-modal popover that answers Escape and
outside-click differently on purpose. And it **seeds four fixed-id starter diagrams** into
`localStorage` on every boot, inserting what is missing and rewriting all four
when `SEED_VERSION` is bumped.
