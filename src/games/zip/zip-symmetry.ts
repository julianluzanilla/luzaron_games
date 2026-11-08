import { columnOf, edgeBetween, rowOf, type ZipPuzzle } from './zip-types'

/**
 * Rotated/mirrored copy (k = 0..7). Numbers, walls and the solution path move
 * together, so the puzzle keeps its single solution and its score.
 */
export function transformZipPuzzle(puzzle: ZipPuzzle, k: number): ZipPuzzle {
  const n = puzzle.size

  const cell = (index: number) => {
    let a = rowOf(n, index)
    let b = k & 1 ? n - 1 - columnOf(n, index) : columnOf(n, index)
    for (let turn = 0; turn < k >> 1; turn += 1) [a, b] = [b, n - 1 - a]
    return a * n + b
  }

  // Edge id = top/left cell * 2 (+1 when it's the bottom edge).
  const wall = (edge: number) => {
    const from = Math.floor(edge / 2)
    return edgeBetween(n, cell(from), cell(edge % 2 ? from + n : from + 1))
  }

  return {
    ...puzzle,
    numbers: puzzle.numbers.map(cell),
    walls: puzzle.walls.map(wall),
    solution: puzzle.solution.map(cell),
  }
}
