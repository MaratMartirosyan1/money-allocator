/**
 * Splits `total` integer units across `weights` so that the parts sum to
 * *exactly* `total`.
 *
 * Each part takes `floor(total * w / sumW)`; the units lost to flooring are
 * handed out one apiece to the largest fractional remainders, ties broken by
 * declaration order. This is the standard largest-remainder (Hare–Niemeyer)
 * apportionment, and it is what keeps a parent's money from leaking: three
 * children at 33.33/33.33/33.34 of 100,000 come back as 33,330/33,330/33,340,
 * not 99,999 or 100,001.
 */
export function largestRemainder(total: number, weights: number[]): number[] {
  const n = weights.length
  if (n === 0) return []

  const zeros = new Array<number>(n).fill(0)
  const sumW = weights.reduce((acc, w) => acc + Math.max(0, w), 0)
  if (total <= 0 || sumW <= 0) return zeros

  const exact = weights.map((w) => (total * Math.max(0, w)) / sumW)
  const parts = exact.map((v) => Math.floor(v))
  const assigned = parts.reduce((acc, v) => acc + v, 0)

  // Flooring loses strictly less than one unit per part, so leftover < n.
  const leftover = total - assigned
  if (leftover <= 0) return parts

  const byRemainder = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i)

  for (let k = 0; k < leftover; k++) {
    const slot = byRemainder[k % n]
    if (!slot) break
    parts[slot.i] = (parts[slot.i] ?? 0) + 1
  }

  return parts
}

/** Splits `total` into `n` parts as evenly as possible, summing exactly. */
export function splitEvenly(total: number, n: number): number[] {
  return largestRemainder(total, new Array<number>(n).fill(1))
}
