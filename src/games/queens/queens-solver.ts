/**
 * Exact solver for Queens boards.
 *
 * Rules being enforced:
 * - Exactly one queen per row, per column, and per region.
 * - No two queens may touch, including diagonally (king-move adjacency).
 *
 * The solver uses "most constrained row first" (MRV) ordering + bitmasks for
 * columns/regions, which keeps it fast enough (sub-millisecond to a few ms)
 * even on 12x12 boards for well-formed puzzles. It's also used by the
 * generator to count/collect solutions while it repairs a board down to a
 * single solution.
 */

export interface SolveOptions {
  /** Stop once this many solutions have been found. */
  limit?: number
  /** Abort (mark as aborted) after exploring this many search nodes. */
  nodeBudget?: number
  /** Collect the actual solutions (row -> column) instead of only counting. */
  collect?: boolean
}

export interface SolveResult {
  count: number
  aborted: boolean
  nodes: number
  /** Only populated when `collect: true`. Each solution is column-by-row. */
  solutions: number[][]
}

export function solveQueensBoard(
  size: number,
  regionOf: number[][],
  options: SolveOptions = {}
): SolveResult {
  const { limit = 2, nodeBudget = 200_000, collect = false } = options

  const fullColumnMask = (1 << size) - 1
  const placedColumnByRow = new Array<number>(size).fill(-1)
  const usedRow = new Array<boolean>(size).fill(false)
  const solutions: number[][] = []

  let count = 0
  let nodes = 0
  let aborted = false

  function pickMostConstrainedRow(
    columnMask: number,
    regionUsedMask: number
  ): { row: number; options: number[] } {
    let bestRow = -1
    let bestOptions: number[] = []
    let bestSize = Infinity

    for (let row = 0; row < size; row += 1) {
      if (usedRow[row]) continue

      const options: number[] = []

      for (let column = 0; column < size; column += 1) {
        if (!((columnMask >> column) & 1)) continue

        const regionId = regionOf[row][column]

        if ((regionUsedMask >> regionId) & 1) continue

        options.push(column)
      }

      if (options.length < bestSize) {
        bestSize = options.length
        bestRow = row
        bestOptions = options

        if (bestSize === 0) break
      }
    }

    return { row: bestRow, options: bestOptions }
  }

  function isAdjacentToAnyPlacedQueen(row: number, column: number): boolean {
    for (let otherRow = 0; otherRow < size; otherRow += 1) {
      const otherColumn = placedColumnByRow[otherRow]

      if (otherColumn === -1) continue
      if (Math.abs(otherRow - row) <= 1 && Math.abs(otherColumn - column) <= 1) return true
    }

    return false
  }

  function backtrack(columnMask: number, regionUsedMask: number, placedCount: number): void {
    if (count >= limit || aborted) return

    nodes += 1

    if (nodes > nodeBudget) {
      aborted = true
      return
    }

    if (placedCount === size) {
      count += 1

      if (collect) solutions.push([...placedColumnByRow])

      return
    }

    const { row, options } = pickMostConstrainedRow(columnMask, regionUsedMask)

    if (row === -1 || options.length === 0) return

    for (const column of options) {
      if (isAdjacentToAnyPlacedQueen(row, column)) continue

      const regionId = regionOf[row][column]

      placedColumnByRow[row] = column
      usedRow[row] = true

      backtrack(columnMask & ~(1 << column), regionUsedMask | (1 << regionId), placedCount + 1)

      usedRow[row] = false
      placedColumnByRow[row] = -1

      if (count >= limit || aborted) return
    }
  }

  backtrack(fullColumnMask, 0, 0)

  return { count, aborted, nodes, solutions }
}

export function hasUniqueSolution(size: number, regionOf: number[][]): boolean {
  const result = solveQueensBoard(size, regionOf, { limit: 2, nodeBudget: 200_000 })

  return !result.aborted && result.count === 1
}
