import type { StoredQueensPuzzle } from './queens-level'

/** Maps (row, column) through one of the 8 symmetries of the square (k = 0..7). */
function mapCell(n: number, k: number, row: number, column: number): [number, number] {
  let a = row
  let b = k & 1 ? n - 1 - column : column

  for (let turn = 0; turn < k >> 1; turn += 1) [a, b] = [b, n - 1 - a]

  return [a, b]
}

/**
 * Rotated/mirrored copy of a puzzle. Queens rules (row, column, region,
 * no touching) are invariant under these, so the solution stays unique.
 */
export function transformQueensPuzzle(puzzle: StoredQueensPuzzle, k: number): StoredQueensPuzzle {
  const n = puzzle.size
  const regionOf = Array.from({ length: n }, () => new Array<number>(n).fill(0))
  const solution = new Array<number>(n).fill(0)

  for (let row = 0; row < n; row += 1) {
    for (let column = 0; column < n; column += 1) {
      const [r, c] = mapCell(n, k, row, column)
      regionOf[r][c] = puzzle.regionOf[row][column]
    }

    const [r, c] = mapCell(n, k, row, puzzle.solution[row])
    solution[r] = c
  }

  return { ...puzzle, regionOf, solution }
}

/** Same key for a region map and all its rotations/mirrors, ignoring region ids. */
export function canonicalRegionKey(puzzle: StoredQueensPuzzle): string {
  let best = ''

  for (let k = 0; k < 8; k += 1) {
    const ids = new Map<number, number>()
    const key = transformQueensPuzzle(puzzle, k)
      .regionOf.flat()
      .map((id) => {
        if (!ids.has(id)) ids.set(id, ids.size)
        return ids.get(id)!.toString(36)
      })
      .join('')

    if (best === '' || key < best) best = key
  }

  return best
}
