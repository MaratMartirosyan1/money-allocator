import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createNode, newId, starterSystem } from '../domain/factory'
import { descendantIds, getChildren, partitionGroup } from '../domain/tree'
import { percentHeadroom } from '../domain/validate'
import type {
  AllocNode,
  AllocationSystem,
  Mode,
  NodePosition,
} from '../domain/types'

export type ThemeMode = 'light' | 'dark' | 'system'

export interface AllocatorState {
  /** Every saved diagram, keyed by id. `systemOrder` gives the list order. */
  systems: Record<string, AllocationSystem>
  systemOrder: string[]
  activeSystemId: string
  theme: ThemeMode
  /** This month's income, in minor units. */
  income: number
  selectedNodeId: string | null
  /** Whether the payouts/checks sidebar is showing. */
  sidebarOpen: boolean

  setIncome: (minorUnits: number) => void
  toggleSidebar: () => void
  setTheme: (theme: ThemeMode) => void
  selectNode: (id: string | null) => void

  addChild: (parentId: string) => string | null
  renameNode: (id: string, name: string) => void
  setValue: (id: string, value: number) => void
  setMode: (id: string, mode: Mode) => void
  removeNode: (id: string) => void
  moveNode: (id: string, newParentId: string) => void
  reorderSibling: (id: string, delta: number) => void

  setNodePosition: (id: string, position: NodePosition) => void
  clearPositions: () => void

  createSystem: (name?: string) => string
  duplicateSystem: (id: string) => string | null
  deleteSystem: (id: string) => void
  selectSystem: (id: string) => void
  renameSystem: (id: string, name: string) => void
}

/**
 * Applies `recipe` to a copy of one system. `nodes` is shallow-cloned here;
 * individual nodes must be cloned through `touch` so that untouched nodes keep
 * their object identity and their React Flow node stays memoized.
 */
function editSystem(
  get: () => AllocatorState,
  set: (partial: Partial<AllocatorState>) => void,
  systemId: string,
  recipe: (draft: AllocationSystem) => void,
): void {
  const state = get()
  const current = state.systems[systemId]
  if (!current) return

  const draft: AllocationSystem = { ...current, nodes: { ...current.nodes } }
  recipe(draft)
  draft.updatedAt = new Date().toISOString()

  set({ systems: { ...state.systems, [draft.id]: draft } })
}

function editActive(
  get: () => AllocatorState,
  set: (partial: Partial<AllocatorState>) => void,
  recipe: (draft: AllocationSystem) => void,
): void {
  editSystem(get, set, get().activeSystemId, recipe)
}

/** "Allocation", then "Allocation 2", "Allocation 3"… */
function uniqueName(taken: string[], base: string): string {
  const used = new Set(taken.map((n) => n.trim().toLowerCase()))
  if (!used.has(base.trim().toLowerCase())) return base
  for (let n = 2; ; n++) {
    const candidate = `${base} ${n}`
    if (!used.has(candidate.trim().toLowerCase())) return candidate
  }
}

/**
 * A full copy of a system under a new id. Node ids are carried over unchanged:
 * they are only ever looked up within their own system, so there is nothing to
 * collide with.
 */
function copySystem(source: AllocationSystem, name: string): AllocationSystem {
  const nodes: Record<string, AllocNode> = {}
  for (const [id, node] of Object.entries(source.nodes)) {
    nodes[id] = { ...node, childIds: [...node.childIds] }
  }

  const positions: Record<string, NodePosition> = {}
  for (const [id, at] of Object.entries(source.positions ?? {})) {
    positions[id] = { ...at }
  }

  const now = new Date().toISOString()
  return {
    ...source,
    id: newId(),
    name,
    nodes,
    ...(Object.keys(positions).length > 0 ? { positions } : {}),
    createdAt: now,
    updatedAt: now,
  }
}

/** Clones a node into the draft so it can be mutated safely. */
function touch(draft: AllocationSystem, id: string): AllocNode | undefined {
  const node = draft.nodes[id]
  if (!node) return undefined
  const clone: AllocNode = { ...node, childIds: [...node.childIds] }
  draft.nodes[id] = clone
  return clone
}

/** Exported so tests can put the store back to a known state. */
export function createInitialState() {
  const system = starterSystem()
  return {
    systems: { [system.id]: system },
    systemOrder: [system.id],
    activeSystemId: system.id,
    theme: 'system' as ThemeMode,
    income: 0,
    selectedNodeId: null,
    sidebarOpen: true,
  }
}

export const useAllocatorStore = create<AllocatorState>()(
  persist(
    (set, get) => ({
      ...createInitialState(),

      setIncome: (minorUnits) => {
        set({ income: Math.max(0, Math.round(minorUnits)) })
      },

      selectNode: (id) => set({ selectedNodeId: id }),

      toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),

      setTheme: (theme) => set({ theme }),

      addChild: (parentId) => {
        const state = get()
        const system = state.systems[state.activeSystemId]
        if (!system?.nodes[parentId]) return null

        // The first child defaults to `auto` so it immediately holds 100% and
        // the tree is never in a warning state mid-edit. Later siblings come
        // in as a small percentage, leaving the auto node to absorb the rest.
        const existing = getChildren(system, parentId)
        const { autoKids } = partitionGroup(existing)
        const mode: Mode = existing.length === 0 ? 'auto' : 'percent'
        const headroom = percentHeadroom(system, parentId)
        const value =
          mode === 'percent' && autoKids.length > 0
            ? Math.min(10, headroom)
            : 0

        const child = createNode(parentId, { mode, value })

        editActive(get, set, (draft) => {
          draft.nodes[child.id] = child
          const parent = touch(draft, parentId)
          if (parent) parent.childIds = [...parent.childIds, child.id]
        })

        set({ selectedNodeId: child.id })
        return child.id
      },

      renameNode: (id, name) => {
        editActive(get, set, (draft) => {
          const node = touch(draft, id)
          if (node) node.name = name
        })
      },

      setValue: (id, value) => {
        editActive(get, set, (draft) => {
          const node = touch(draft, id)
          if (node) node.value = Number.isFinite(value) ? Math.max(0, value) : 0
        })
      },

      setMode: (id, mode) => {
        const state = get()
        const system = state.systems[state.activeSystemId]
        const node = system?.nodes[id]
        if (!system || !node || node.parentId === null) return

        const headroom = percentHeadroom(system, node.parentId, id)
        const nextValue = mode === 'percent' ? Math.min(10, headroom) : 0

        editActive(get, set, (draft) => {
          const target = touch(draft, id)
          if (!target) return
          target.mode = mode
          // Keep an existing value when it still makes sense for the new mode.
          if (mode === 'percent') {
            target.value = node.mode === 'percent' ? node.value : nextValue
          } else if (mode === 'fixed') {
            target.value = node.mode === 'fixed' ? node.value : 0
          } else {
            target.value = 0
          }
        })
      },

      removeNode: (id) => {
        const state = get()
        const system = state.systems[state.activeSystemId]
        const node = system?.nodes[id]
        // The root holds the income; it can be reset but never deleted.
        if (!system || !node || node.parentId === null) return

        const doomed = [id, ...descendantIds(system, id)]

        editActive(get, set, (draft) => {
          for (const doomedId of doomed) delete draft.nodes[doomedId]
          const parent = node.parentId ? touch(draft, node.parentId) : undefined
          if (parent) parent.childIds = parent.childIds.filter((c) => c !== id)

          if (draft.positions) {
            const kept = { ...draft.positions }
            for (const doomedId of doomed) delete kept[doomedId]
            draft.positions = kept
          }
        })

        if (state.selectedNodeId && doomed.includes(state.selectedNodeId)) {
          set({ selectedNodeId: node.parentId })
        }
      },

      moveNode: (id, newParentId) => {
        const state = get()
        const system = state.systems[state.activeSystemId]
        const node = system?.nodes[id]
        if (!system || !node || node.parentId === null) return
        if (id === newParentId || node.parentId === newParentId) return
        if (!system.nodes[newParentId]) return
        // Re-parenting into your own subtree would detach the whole branch.
        if (descendantIds(system, id).includes(newParentId)) return

        editActive(get, set, (draft) => {
          const oldParent = node.parentId ? touch(draft, node.parentId) : undefined
          if (oldParent) {
            oldParent.childIds = oldParent.childIds.filter((c) => c !== id)
          }
          const newParent = touch(draft, newParentId)
          if (newParent) newParent.childIds = [...newParent.childIds, id]
          const moved = touch(draft, id)
          if (moved) moved.parentId = newParentId
        })
      },

      reorderSibling: (id, delta) => {
        const state = get()
        const system = state.systems[state.activeSystemId]
        const node = system?.nodes[id]
        if (!system || !node?.parentId) return

        editActive(get, set, (draft) => {
          const parent = node.parentId ? touch(draft, node.parentId) : undefined
          if (!parent) return
          const from = parent.childIds.indexOf(id)
          const to = from + delta
          if (from < 0 || to < 0 || to >= parent.childIds.length) return
          const next = [...parent.childIds]
          const [pulled] = next.splice(from, 1)
          if (pulled !== undefined) next.splice(to, 0, pulled)
          parent.childIds = next
        })
      },

      setNodePosition: (id, position) => {
        editActive(get, set, (draft) => {
          if (!draft.nodes[id]) return
          draft.positions = {
            ...draft.positions,
            // Whole pixels only — sub-pixel drift makes positions churn.
            [id]: { x: Math.round(position.x), y: Math.round(position.y) },
          }
        })
      },

      /** Drops every manual position, handing the canvas back to the layout. */
      clearPositions: () => {
        editActive(get, set, (draft) => {
          delete draft.positions
        })
      },

      renameSystem: (id, name) => {
        editSystem(get, set, id, (draft) => {
          draft.name = name
        })
      },

      createSystem: (name) => {
        const state = get()
        const taken = state.systemOrder.flatMap(
          (sid) => state.systems[sid]?.name ?? [],
        )
        const fresh = starterSystem()
        fresh.name = uniqueName(taken, name?.trim() || 'Allocation')

        set({
          systems: { ...state.systems, [fresh.id]: fresh },
          systemOrder: [...state.systemOrder, fresh.id],
          activeSystemId: fresh.id,
          selectedNodeId: null,
        })

        return fresh.id
      },

      duplicateSystem: (id) => {
        const state = get()
        const source = state.systems[id]
        if (!source) return null

        const taken = state.systemOrder.flatMap(
          (sid) => state.systems[sid]?.name ?? [],
        )
        const copy = copySystem(source, uniqueName(taken, `${source.name} copy`))

        // Sit the copy next to its original rather than at the end.
        const order = [...state.systemOrder]
        order.splice(order.indexOf(id) + 1, 0, copy.id)

        set({
          systems: { ...state.systems, [copy.id]: copy },
          systemOrder: order,
          activeSystemId: copy.id,
          selectedNodeId: null,
        })

        return copy.id
      },

      deleteSystem: (id) => {
        const state = get()
        if (!state.systems[id]) return

        const removedAt = state.systemOrder.indexOf(id)
        const order = state.systemOrder.filter((sid) => sid !== id)
        const systems = { ...state.systems }
        delete systems[id]

        // Falling back to the neighbour that took its place keeps the list
        // from jumping to the top on every delete. Deleting the last diagram
        // is allowed — the list page has an empty state for it.
        const nextActive =
          state.activeSystemId === id
            ? (order[Math.min(removedAt, order.length - 1)] ?? '')
            : state.activeSystemId

        set({
          systems,
          systemOrder: order,
          activeSystemId: nextActive,
          selectedNodeId: null,
        })
      },

      selectSystem: (id) => {
        if (!get().systems[id]) return
        set({ activeSystemId: id, selectedNodeId: null })
      },
    }),
    {
      name: 'mny-allocator',
      version: 1,
      // The diagrams, the income and the display preferences are worth
      // keeping; transient selection is not.
      partialize: (state) => ({
        systems: state.systems,
        systemOrder: state.systemOrder,
        activeSystemId: state.activeSystemId,
        income: state.income,
        sidebarOpen: state.sidebarOpen,
        theme: state.theme,
      }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<AllocatorState> | undefined
        const active = saved?.activeSystemId
        // Fall back to a fresh starter if the stored blob is unusable.
        if (!saved?.systems || !active || !saved.systems[active]) return current
        return { ...current, ...saved }
      },
    },
  ),
)
