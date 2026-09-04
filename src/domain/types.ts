/** How a node claims its share of its parent's money. */
export type Mode = 'percent' | 'fixed' | 'auto'

export interface AllocNode {
  id: string
  /** Display name, e.g. "Charity", "Spendings". */
  name: string
  parentId: string | null
  /** Ordered — the order drives largest-remainder tie-breaks. */
  childIds: string[]
  /** Ignored on the root node. */
  mode: Mode
  /**
   * `percent` → 0–100. `fixed` → minor units. `auto` → unused.
   */
  value: number
}

export interface NodePosition {
  x: number
  y: number
}

export interface AllocationSystem {
  id: string
  name: string
  /** ISO 4217 code, e.g. 'AMD'. */
  currency: string
  /** Minor-unit exponent: 0 for AMD, 2 for USD. */
  currencyDecimals: number
  schemaVersion: 1
  rootId: string
  /** Normalized flat map — updates are single-key writes. */
  nodes: Record<string, AllocNode>
  /**
   * Manual canvas positions, for nodes the user has dragged. Absent entries
   * fall back to the automatic layout. Purely presentational — the engine
   * never reads this.
   */
  positions?: Record<string, NodePosition>
  createdAt: string
  updatedAt: string
}

export type IssueLevel = 'error' | 'warning'

export type IssueCode =
  // Static — checkable without an income.
  | 'PERCENT_SUM_EXCEEDS_100'
  | 'INVALID_PERCENT'
  | 'INVALID_FIXED'
  | 'MULTIPLE_AUTO_SIBLINGS'
  | 'UNALLOCATED_REMAINDER'
  | 'FIXED_WITHOUT_AUTO_SIBLING'
  | 'DUPLICATE_SIBLING_NAME'
  | 'MISSING_ROOT'
  | 'BROKEN_TREE'
  // Runtime — depends on the income entered.
  | 'FIXED_EXCEEDS_AVAILABLE'
  | 'PERCENT_CLAMPED'
  | 'ZERO_ALLOCATION'

export interface Issue {
  /** The node the issue is anchored to — a parent for group-level rules. */
  nodeId: string
  level: IssueLevel
  code: IssueCode
  message: string
}

export interface Payout {
  nodeId: string
  name: string
  /** Minor units. */
  amount: number
  /** Root → node, excluding the root itself. */
  path: string[]
}

export interface AllocationResult {
  /** Minor units, per node id. */
  amounts: Record<string, number>
  /**
   * Share of the parent's amount, 0–100. `null` when it cannot be known —
   * an `auto` node with a `fixed` sibling has no fixed percentage until an
   * income is entered.
   */
  percentOfParent: Record<string, number | null>
  /** Share of the total income, 0–100, or `null` when unknowable. */
  percentOfIncome: Record<string, number | null>
  /** Money stranded on a parent because no `auto` child claimed it. */
  unallocated: Record<string, number>
  /** Runtime issues only — merge with `validateSystem` for the full list. */
  issues: Issue[]
  /** Leaf nodes: the actual accounts that receive money. */
  payouts: Payout[]
}
