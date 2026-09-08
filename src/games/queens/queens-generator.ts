/**
 * Automatic Queens puzzle generator.
 *
 * Approach (three steps):
 *  1. Pick a random valid queen placement: one per row/column, no two
 *     placements touching (adjacent rows must differ by >= 2 columns).
 *  2. Grow one connected colour region per queen (multi-source flood fill,
 *     always extending the currently-smallest region) until it covers the
 *     whole board.
 *  3. That random partition almost never has a *unique* solution on its
 *     own, so we repair it: find another valid placement the current
 *     regions accidentally allow, and move the conflicting cell into the
 *     intended region (only ever touching non-queen cells, so the true
 *     solution never breaks). Every move is checked to keep both affected
 *     regions connected. This is re-run until only one solution remains.
 *
 * This mirrors how real "Queens" style generators work: puzzles are
 * produced by a generator, then verified/repaired for a single, guaranteed
 * solution (see `queens-solver.ts`). Larger boards (10x10+) can take from
 * tens of milliseconds up to a few seconds to repair, which is why the app
 * draws from a pre-generated pool (see scripts/generate-queens-pool.ts)
 * instead of generating on every click — the same approach used by
 * reference implementations like playqueensgame.com, whose own FAQ
 * describes drawing boards from a large pool of pre-built, quality-checked
 * puzzles rather than generating them live per request.
 */

import { solveQueensBoard } from './queens-solver'

export interface GeneratedPuzzle {
  size: number
  /** regionOf[row][column] = region id (0..size-1) */
  regionOf: number[][]
  /** solution[row] = column of the queen in that row */
  solution: number[]
}

export interface GeneratorOptions {
  /** How many times to retry from scratch with a fresh placement/regions. */
  maxOuterAttempts?: number
  /** How many repair rounds to attempt per placement before giving up. */
  maxRepairRounds?: number
}

function shuffled<T>(items: T[]): T[] {
  const copy = [...items]

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }

  return copy
}

function randomSpacedPermutation(size: number): number[] | null {
  const perm = new Array<number>(size).fill(-1)
  const used = new Array<boolean>(size).fill(false)

  function backtrack(row: number): boolean {
    if (row === size) return true

    for (const column of shuffled([...Array(size).keys()])) {
      if (used[column]) continue
      if (row > 0 && Math.abs(perm[row - 1] - column) < 2) continue

      perm[row] = column
      used[column] = true

      if (backtrack(row + 1)) return true

      used[column] = false
      perm[row] = -1
    }

    return false
  }

  return backtrack(0) ? perm : null
}

function growRegions(size: number, solution: number[]): number[][] | null {
  const regionOf: number[][] = Array.from({ length: size }, () => new Array(size).fill(-1))
  const frontierOf: Array<Set<number>> = Array.from({ length: size }, () => new Set())
  const regionSize = new Array<number>(size).fill(1)

  const cellKey = (row: number, column: number) => row * size + column

  function addFrontier(regionId: number, row: number, column: number): void {
    if (row < 0 || row >= size || column < 0 || column >= size) return
    if (regionOf[row][column] !== -1) return

    frontierOf[regionId].add(cellKey(row, column))
  }

  for (let regionId = 0; regionId < size; regionId += 1) {
    const column = solution[regionId]

    regionOf[regionId][column] = regionId
    addFrontier(regionId, regionId - 1, column)
    addFrontier(regionId, regionId + 1, column)
    addFrontier(regionId, regionId, column - 1)
    addFrontier(regionId, regionId, column + 1)
  }

  let claimed = size
  const total = size * size
  let stuckRounds = 0

  while (claimed < total) {
    const order = shuffled([...Array(size).keys()]).sort(
      (a, b) => regionSize[a] - regionSize[b]
    )

    let chosenRegionId = -1

    for (const candidate of order) {
      for (const key of [...frontierOf[candidate]]) {
        const row = Math.floor(key / size)
        const column = key % size

        if (regionOf[row][column] !== -1) frontierOf[candidate].delete(key)
      }

      if (frontierOf[candidate].size > 0) {
        chosenRegionId = candidate
        break
      }
    }

    if (chosenRegionId === -1) {
      stuckRounds += 1
      if (stuckRounds > 5) return null
      continue
    }

    stuckRounds = 0

    const options = [...frontierOf[chosenRegionId]]
    const key = options[Math.floor(Math.random() * options.length)]
    const row = Math.floor(key / size)
    const column = key % size

    regionOf[row][column] = chosenRegionId
    claimed += 1
    regionSize[chosenRegionId] += 1
    frontierOf[chosenRegionId].delete(key)

    addFrontier(chosenRegionId, row - 1, column)
    addFrontier(chosenRegionId, row + 1, column)
    addFrontier(chosenRegionId, row, column - 1)
    addFrontier(chosenRegionId, row, column + 1)
  }

  return regionOf
}

function regionCells(size: number, regionOf: number[][], regionId: number): Array<[number, number]> {
  const cells: Array<[number, number]> = []

  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      if (regionOf[row][column] === regionId) cells.push([row, column])
    }
  }

  return cells
}

function isRegionConnected(size: number, regionOf: number[][], regionId: number): boolean {
  const cells = regionCells(size, regionOf, regionId)

  if (cells.length === 0) return false

  const cellSet = new Set(cells.map(([row, column]) => row * size + column))
  const visited = new Set<number>()
  const stack: Array<[number, number]> = [cells[0]]

  visited.add(cells[0][0] * size + cells[0][1])

  while (stack.length > 0) {
    const [row, column] = stack.pop() as [number, number]

    for (const [deltaRow, deltaColumn] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nextRow = row + deltaRow
      const nextColumn = column + deltaColumn
      const key = nextRow * size + nextColumn

      if (nextRow < 0 || nextRow >= size || nextColumn < 0 || nextColumn >= size) continue
      if (!cellSet.has(key) || visited.has(key)) continue

      visited.add(key)
      stack.push([nextRow, nextColumn])
    }
  }

  return visited.size === cells.length
}

function arraysEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

function repairToUniqueSolution(
  size: number,
  regionOf: number[][],
  solution: number[],
  maxRounds: number
): number[][] | null {
  let current = solveQueensBoard(size, regionOf, { limit: 4, nodeBudget: 50_000, collect: true })

  if (current.aborted) return null
  if (current.count <= 1) return regionOf

  for (let round = 0; round < maxRounds; round += 1) {
    const alternates = current.solutions.filter((candidate) => !arraysEqual(candidate, solution))
    let fixedThisRound = false

    for (const alternate of shuffled(alternates)) {
      const differingRows = shuffled(
        [...Array(size).keys()].filter((row) => alternate[row] !== solution[row])
      )

      for (const row of differingRows) {
        const alternateColumn = alternate[row]
        const trueColumn = solution[row]
        const oldRegionId = regionOf[row][alternateColumn]
        const newRegionId = regionOf[row][trueColumn]

        if (oldRegionId === newRegionId) continue

        regionOf[row][alternateColumn] = newRegionId

        if (
          isRegionConnected(size, regionOf, oldRegionId) &&
          isRegionConnected(size, regionOf, newRegionId)
        ) {
          fixedThisRound = true
          break
        }

        regionOf[row][alternateColumn] = oldRegionId
      }

      if (fixedThisRound) break
    }

    if (!fixedThisRound) {
      // Fall back to a random boundary flip that doesn't make things worse.
      let appliedRandomMove = false

      for (let tries = 0; tries < 30 && !appliedRandomMove; tries += 1) {
        const row = Math.floor(Math.random() * size)
        const column = Math.floor(Math.random() * size)

        if (column === solution[row]) continue

        const regionId = regionOf[row][column]
        const neighborRegionIds: number[] = []

        for (const [deltaRow, deltaColumn] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const nextRow = row + deltaRow
          const nextColumn = column + deltaColumn

          if (nextRow < 0 || nextRow >= size || nextColumn < 0 || nextColumn >= size) continue
          if (regionOf[nextRow][nextColumn] !== regionId) {
            neighborRegionIds.push(regionOf[nextRow][nextColumn])
          }
        }

        if (neighborRegionIds.length === 0) continue

        const newRegionId = neighborRegionIds[Math.floor(Math.random() * neighborRegionIds.length)]

        regionOf[row][column] = newRegionId

        if (!isRegionConnected(size, regionOf, regionId) || !isRegionConnected(size, regionOf, newRegionId)) {
          regionOf[row][column] = regionId
          continue
        }

        const attempt = solveQueensBoard(size, regionOf, {
          limit: 4,
          nodeBudget: 50_000,
          collect: true,
        })

        if (!attempt.aborted && attempt.count <= current.count) {
          current = attempt
          appliedRandomMove = true
        } else {
          regionOf[row][column] = regionId
        }
      }

      if (!appliedRandomMove) return null
    } else {
      current = solveQueensBoard(size, regionOf, { limit: 4, nodeBudget: 50_000, collect: true })

      if (current.aborted) return null
    }

    if (current.count <= 1) return regionOf
  }

  return null
}

export function generateQueensPuzzle(
  size: number,
  options: GeneratorOptions = {}
): GeneratedPuzzle | null {
  const { maxOuterAttempts = 10, maxRepairRounds = 600 } = options

  for (let attempt = 0; attempt < maxOuterAttempts; attempt += 1) {
    const solution = randomSpacedPermutation(size)

    if (!solution) continue

    let regionOf = growRegions(size, solution)

    if (!regionOf) continue

    regionOf = repairToUniqueSolution(size, regionOf, solution, maxRepairRounds)

    if (!regionOf) continue

    const finalCheck = solveQueensBoard(size, regionOf, { limit: 2, nodeBudget: 200_000 })

    if (finalCheck.aborted || finalCheck.count !== 1) continue

    return { size, regionOf, solution }
  }

  return null
}
