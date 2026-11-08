import { shuffled } from '../../shell/pick-unseen'
import { getGeometry, type SudokuPuzzle } from './sudoku-types'

/** Order of `count` lines grouped in blocks of `block`: shuffles the blocks and the lines inside each. */
function lineOrder(count: number, block: number): number[] {
  const blocks = shuffled([...Array(count / block).keys()])
  return blocks.flatMap((b) => shuffled([...Array(block).keys()]).map((i) => b * block + i))
}

/**
 * Equivalent puzzle: digits relabeled, bands/stacks and the rows/columns
 * inside them shuffled, and (square boxes only) maybe transposed. None of
 * these change uniqueness or the logic needed, so difficulty stays the same.
 */
export function transformSudokuPuzzle(puzzle: SudokuPuzzle): SudokuPuzzle {
  const { size, boxRows, boxCols } = getGeometry(puzzle.variant)
  const digits = [0, ...shuffled([...Array(size).keys()].map((d) => d + 1))]
  const rows = lineOrder(size, boxRows)
  const columns = lineOrder(size, boxCols)
  const transpose = boxRows === boxCols && Math.random() < 0.5

  const map = (grid: number[]) =>
    grid.map((_, index) => {
      let row = rows[Math.floor(index / size)]
      let column = columns[index % size]
      if (transpose) [row, column] = [column, row]
      return digits[grid[row * size + column]]
    })

  return { ...puzzle, givens: map(puzzle.givens), solution: map(puzzle.solution) }
}
