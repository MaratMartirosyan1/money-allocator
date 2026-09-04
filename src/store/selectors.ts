import { computeAllocation } from '../domain/engine'
import { validateSystem } from '../domain/validate'
import type {
  AllocationResult,
  AllocationSystem,
  Issue,
} from '../domain/types'
import { useAllocatorStore } from './useAllocatorStore'

/**
 * Both of these are pure functions of an immutable system object, so a
 * single-entry identity cache is enough to keep them off the render path.
 * Store edits always produce a new system object, which invalidates the entry.
 */
let allocationCache: {
  system: AllocationSystem
  income: number
  result: AllocationResult
} | null = null

export function allocationOf(
  system: AllocationSystem,
  income: number,
): AllocationResult {
  if (
    allocationCache &&
    allocationCache.system === system &&
    allocationCache.income === income
  ) {
    return allocationCache.result
  }
  const result = computeAllocation(system, income)
  allocationCache = { system, income, result }
  return result
}

let staticCache: { system: AllocationSystem; issues: Issue[] } | null = null

export function staticIssuesOf(system: AllocationSystem): Issue[] {
  if (staticCache && staticCache.system === system) return staticCache.issues
  const issues = validateSystem(system)
  staticCache = { system, issues }
  return issues
}

let mergedCache: {
  system: AllocationSystem
  income: number
  issues: Issue[]
} | null = null

/**
 * Static config problems plus this income's runtime problems, in one list.
 * The engine deliberately reports only the latter, so they are joined here.
 */
export function allIssuesOf(
  system: AllocationSystem,
  income: number,
): Issue[] {
  if (
    mergedCache &&
    mergedCache.system === system &&
    mergedCache.income === income
  ) {
    return mergedCache.issues
  }
  const issues = [
    ...staticIssuesOf(system),
    ...allocationOf(system, income).issues,
  ]
  mergedCache = { system, income, issues }
  return issues
}

export interface NodeIssues {
  errors: Issue[]
  warnings: Issue[]
}

let byNodeCache: {
  issues: Issue[]
  map: Record<string, NodeIssues>
} | null = null

export function issuesByNode(issues: Issue[]): Record<string, NodeIssues> {
  if (byNodeCache && byNodeCache.issues === issues) return byNodeCache.map

  const map: Record<string, NodeIssues> = {}
  for (const issue of issues) {
    const entry = map[issue.nodeId] ?? { errors: [], warnings: [] }
    if (issue.level === 'error') entry.errors.push(issue)
    else entry.warnings.push(issue)
    map[issue.nodeId] = entry
  }

  byNodeCache = { issues, map }
  return map
}

// ---- hooks -----------------------------------------------------------------

export function useActiveSystem(): AllocationSystem {
  return useAllocatorStore((s) => {
    const system = s.systems[s.activeSystemId]
    if (!system) throw new Error('active system is missing')
    return system
  })
}

export function useAllocation(): AllocationResult {
  const system = useActiveSystem()
  const income = useAllocatorStore((s) => s.income)
  return allocationOf(system, income)
}

export function useIssues(): Issue[] {
  const system = useActiveSystem()
  const income = useAllocatorStore((s) => s.income)
  return allIssuesOf(system, income)
}

export function useNodeIssues(): Record<string, NodeIssues> {
  return issuesByNode(useIssues())
}
