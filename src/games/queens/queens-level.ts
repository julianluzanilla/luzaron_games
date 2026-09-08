import type { QueensBoardState, QueensCell, QueensPosition } from './queens-types'

export interface StoredQueensPuzzle {
  id: string
  size: number
  /** regionOf[row][column] = region id (0..size-1) */
  regionOf: number[][]
  /** solution[row] = column of the queen in that row */
  solution: number[]
}

export interface StoredQueensPack {
  size: number
  generatedAt: string
  puzzles: StoredQueensPuzzle[]
}

export function createBoardStateFromPuzzle(
  puzzle: StoredQueensPuzzle,
  puzzleNumber: number
): QueensBoardState {
  const { size } = puzzle

  const cells: QueensCell[][] = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) => ({
      row,
      column,
      regionId: String(puzzle.regionOf[row][column]),
      value: 'empty',
    }))
  )

  const solution: QueensPosition[] = puzzle.solution.map((column, row) => ({ row, column }))

  return {
    levelId: puzzle.id,
    size,
    title: `Queens ${size}x${size} · #${puzzleNumber}`,
    cells,
    solution,
    hintsUsed: 0,
    isCompleted: false,
  }
}
