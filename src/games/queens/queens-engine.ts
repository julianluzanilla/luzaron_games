import type { QueensBoardState, QueensCellValue } from './queens-types'

export function getNextQueensCellValue(currentValue: QueensCellValue): QueensCellValue {
  if (currentValue === 'empty') return 'x'
  if (currentValue === 'x') return 'queen'

  return 'empty'
}

export function applyQueensCellCycle(
  board: QueensBoardState,
  row: number,
  column: number
): QueensBoardState {
  if (!isInsideBoard(board, row, column)) return board

  const nextCells = board.cells.map((boardRow) =>
    boardRow.map((cell) => {
      if (cell.row !== row || cell.column !== column) return cell

      return {
        ...cell,
        value: getNextQueensCellValue(cell.value),
      }
    })
  )

  return {
    ...board,
    cells: nextCells,
  }
}

export function isInsideBoard(board: QueensBoardState, row: number, column: number): boolean {
  return row >= 0 && row < board.size && column >= 0 && column < board.size
}
