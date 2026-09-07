# Money Allocator

A tree-based monthly income allocator. Build a diagram of accounts once, then
each month type in your income and read off what every account receives.

```
                    Monthly income  ֏1,000,000
                            │
        ┌───────────────────┼───────────────────┐
    Charity 10%         Savings 10%         Living  auto → 80%
     ֏100,000            ֏100,000              ֏800,000
                                                  │
                                        ┌─────────┴─────────┐
                                    Rent  fixed        Spendings  auto → 62.5%
                                    ֏300,000              ֏500,000
```

## Getting started

```sh
npm install
npm run dev
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm test` | Vitest suite |
| `npm run test:watch` | Vitest in watch mode |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | Oxlint |

Everything is saved to `localStorage` as you edit — there is no backend and
nothing leaves the browser.

## Languages

The interface is available in **English, Русский and Հայերեն**, switchable from
the header on any screen and remembered with your other preferences. Numbers,
currency and "3 minutes ago" follow the chosen language too, and plurals go
through `Intl.PluralRules`, so Russian gets all three of its forms rather than
a guess.

Translations live in `src/i18n/`. English is the source dictionary and its keys
*are* the key type, so a locale missing a key is a compile error, not a blank
label at runtime.

## On a phone

The whole app works on a phone, down to a folded Galaxy Z Fold at 344px. The
top bar reflows into three rows, the payouts and checks panel becomes a bottom
sheet you swipe away, tap targets and inputs grow for touch — the last of which
also stops iOS zooming in on every field it focuses — and the canvas pans and
pinch-zooms as you would expect. Safe-area insets keep controls clear of the
iPhone's notch and home indicator.

## Starter diagrams

Four allocation diagrams ship with the app and are re-asserted into browser
storage on every load, so a fresh browser opens onto something real. They are
matched by fixed id, so having them already does not create duplicates; a
`SEED_VERSION` bump in `src/domain/seeds.ts` is what pushes a correction out to
people who already have them. Because the rule is "always present", deleting a
starter diagram is not permanent — it returns on the next load.

To change them, dump the `mny-allocator` localStorage value to a file and run:

```sh
node scripts/import-seeds.mjs .claude/seed-localstorage.json
```

which regenerates `src/domain/seeds.data.ts` and refuses to write a tree the
engine could not walk.

## Pages

| Route | Page |
|---|---|
| `/` | **Diagrams** — every saved diagram, with create / rename / duplicate / delete |
| `/d/:id` | **Editor** — one diagram's canvas, with **← Diagrams** to go back |

The URL owns which diagram is open, so links are shareable, refresh keeps you
in place, and the browser's own back button behaves.

You can keep as many diagrams as you like — one per scenario, say a household
budget and a freelance one. **There is no save button**: every edit is written
to browser storage as you make it, and each card shows when it was last
touched. Delete them all and the list offers an empty state to start again.

Diagrams are fully independent — duplicating one deep-copies its tree, so
editing the copy never touches the original. The income is shared across
diagrams rather than stored per diagram, which lets you type one figure and
flip between strategies to compare what each pays out.

**Deploying:** these are real client-side routes, so a static host needs a
rewrite sending unknown paths to `index.html`. `npm run dev` and
`npm run preview` already do this.

## Theme

Light, dark, or match the OS — the three-way switch sits in the top bar and the
choice persists. An inline script in `index.html` applies a saved dark theme
before React mounts, so there is no flash of light on load.

## How allocation works

Every node below the root claims its share in one of three ways:

- **`%`** — a percentage of its **parent's** amount.
- **`Fixed`** — an absolute amount, e.g. 300,000 AMD.
- **`Auto`** — absorbs whatever its siblings leave over. Its percentage is
  derived and displayed, never typed.

Within a sibling group the order is fixed:

1. **Percentages first**, always of the parent's *full* amount — never of what
   is left after fixed siblings. This keeps a node's percentage stable when a
   fixed sibling's amount changes.
2. **Fixed amounts next**, out of what the percentages left behind.
3. **Auto nodes last**, splitting the remainder evenly.

So under a parent holding 1,000,000 with children `10%`, `fixed 300,000` and
`auto`: 100,000 / 300,000 / 600,000, and the auto node shows **60%**.

### Two kinds of problem

The distinction drives the whole validation design:

| | Example | Caught |
|---|---|---|
| **Config error** | siblings summing to 110% | immediately, before any income |
| **Runtime error** | `fixed 300,000` under a node receiving only 160,000 | only once an income is entered |

A tree can be perfectly valid and still break at a low income. When it does,
the fixed amounts are reduced proportionally — a shortfall is shared, never
dumped on whichever node happens to sort last — and the node is flagged. No
amount is ever negative.

### Exact arithmetic

Money is held as **integer minor units** (AMD → 0 decimals) and apportioned by
**largest remainder**, so `sum(children) + unallocated === parent` holds
exactly at every node. Three children at 33.33 / 33.33 / 33.34 of 100,000 come
back as 33,330 / 33,330 / 33,340 — no drams leak at any depth. The payout
table's total is the visible proof.

## Layout

Nodes are **draggable**, and a dragged position is saved with the system, so a
manual arrangement survives edits. **Tidy up** (top-right of the canvas,
appears once you have moved something) drops manual positions and hands the
canvas back to the automatic layout.

That automatic layout is `layout/tidyTree.ts` rather than dagre. Dagre is a
general layered-graph engine whose crossing-minimization pass reorders nodes
within a rank — for a tree it emits siblings in *reverse* insertion order, so a
newly added child landed on the far left, and there is no supported way to pin
it. Since this graph is always a strict tree, a direct layout gives the
ordering we want by construction: leaves are packed left to right in `childIds`
order and each parent is centred over its own first and last child. That
centring keeps every node inside its own subtree's span, and sibling spans are
disjoint, so nodes cannot overlap at any depth.

```
src/
  domain/      the pure engine — no React, no store
    types.ts       model, issue codes
    money.ts       minor units, Intl formatting, input parsing
    rounding.ts    largest-remainder apportionment
    tree.ts        traversal, sibling-group partitioning
    engine.ts      computeAllocation — one DFS, all the semantics
    validate.ts    static, income-independent checks
    factory.ts     node and system constructors
    seeds.ts       the starter diagrams and how they are installed
  store/       zustand + persist, normalized flat node map
  i18n/        en / ru / hy dictionaries, plurals, locale-bound formatters
  layout/      tidy-tree placement → React Flow positions
  pages/       DiagramsPage (the list), EditorPage (one diagram)
  components/  canvas, node cards, payout table, checks panel
```

The engine reports issues as a **code plus structured params**, never as a
finished sentence — `i18n/issues.ts` turns those into prose. A pure function
has no business deciding which language its caller reads, and three languages
is what made that obvious.

`domain/` is the load-bearing part and knows nothing about rendering, which is
why the allocation rules are exhaustively testable and the view is swappable.

## Stack

React 19, TypeScript, Vite, [React Flow](https://reactflow.dev) for the
canvas, React Router for the two pages, Zustand for state, Vitest + Testing
Library for tests. Layout is a small tidy-tree implementation of our own — see
below.

## Not built yet

Multiple saved systems with JSON export/import, per-month run history, a Sankey
view, and drag-to-reparent. See `.claude/plan.md` phases 6–7.
