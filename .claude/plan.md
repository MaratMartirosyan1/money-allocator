# Money Allocator — Implementation Plan

A tree-based monthly income allocator. The user builds a diagram of nodes once
(root = income, children = accounts/categories), configures how each node takes
its share, and then every month enters the income at the top and reads off how
much each account receives.

## Status

Phases 0–5 are **implemented** — the engine, the store, the canvas, live
calculation and the validation UX — plus draggable nodes, a collapsible
sidebar, a theme toggle, and most of phase 6 (diagram management, now split
across a list page and an editor page). 146 tests
pass; `typecheck`, `lint` and `build` are clean.

Still open: JSON export/import (phase 6) and all of phase 7.

## Locked decisions

| Decision | Choice |
|---|---|
| Language | TypeScript (convert the Vite JS template) |
| Diagram | `@xyflow/react` (React Flow); own tidy-tree layout (see note) |
| State | `zustand` + `persist` middleware (localStorage) |
| Tests | `vitest` + `@testing-library/react` |
| v1 scope | Phases 0–5 (single system, auto-saved) |

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

---

## 4. Structure

```
src/
  domain/      types.ts money.ts rounding.ts engine.ts validate.ts (+ .test.ts)
  store/       useSystemStore.ts selectors.ts
  layout/      treeLayout.ts
  components/  AllocatorCanvas.tsx
               nodes/RootNode.tsx nodes/AllocationNode.tsx
               IncomeBar.tsx PayoutSummary.tsx IssueList.tsx
  App.tsx
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
