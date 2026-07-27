import type {
  QueensBoardState,
  QueensCell,
  QueensCellValue,
  QueensPosition,
  QueensXSource,
} from './queens-types'

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

  const nextCells: QueensCell[][] = board.cells.map((boardRow) =>
    boardRow.map((cell): QueensCell => {
      if (cell.row !== row || cell.column !== column) return cell

      const nextValue = getNextQueensCellValue(cell.value)

      return createUpdatedCell(cell, nextValue, nextValue === 'x' ? 'manual' : undefined)
    })
  )

  return rebuildAutoMarks({
    ...board,
    cells: nextCells,
  })
}

export function applyQueensManualX(
  board: QueensBoardState,
  row: number,
  column: number
): QueensBoardState {
  if (!isInsideBoard(board, row, column)) return board

  const nextCells: QueensCell[][] = board.cells.map((boardRow) =>
    boardRow.map((cell): QueensCell => {
      if (cell.row !== row || cell.column !== column) return cell
      if (cell.value === 'queen') return cell

      return createUpdatedCell(cell, 'x', 'manual')
    })
  )

  return rebuildAutoMarks({
    ...board,
    cells: nextCells,
  })
}

export function isInsideBoard(board: QueensBoardState, row: number, column: number): boolean {
  return row >= 0 && row < board.size && column >= 0 && column < board.size
}

export function getQueensConflictKeys(board: QueensBoardState): Set<string> {
  const queens = getQueenCells(board)
  const conflictKeys = new Set<string>()

  for (let index = 0; index < queens.length; index += 1) {
    const queen = queens[index]

    for (let compareIndex = index + 1; compareIndex < queens.length; compareIndex += 1) {
      const otherQueen = queens[compareIndex]

      if (areQueensInConflict(queen, otherQueen)) {
        conflictKeys.add(createPositionKey(queen))
        conflictKeys.add(createPositionKey(otherQueen))
      }
    }
  }

  return conflictKeys
}

export function createPositionKey(position: QueensPosition): string {
  return `${position.row}:${position.column}`
}

function rebuildAutoMarks(board: QueensBoardState): QueensBoardState {
  const queens = getQueenCells(board)
  const autoMarkedKeys = getAutoMarkedKeys(board, queens)

  const nextCells: QueensCell[][] = board.cells.map((boardRow) =>
    boardRow.map((cell): QueensCell => {
      if (cell.value === 'queen') {
        return createUpdatedCell(cell, 'queen')
      }

      if (cell.value === 'x' && cell.xSource === 'manual') {
        return cell
      }

      if (autoMarkedKeys.has(createPositionKey(cell))) {
        return createUpdatedCell(cell, 'x', 'auto')
      }

      return createUpdatedCell(cell, 'empty')
    })
  )

  return {
    ...board,
    cells: nextCells,
  }
}

function getAutoMarkedKeys(board: QueensBoardState, queens: QueensCell[]): Set<string> {
  const keys = new Set<string>()

  for (const queen of queens) {
    for (const cell of board.cells.flat()) {
      if (cell.row === queen.row && cell.column === queen.column) continue

      const sameRow = cell.row === queen.row
      const sameColumn = cell.column === queen.column
      const sameRegion = cell.regionId === queen.regionId
      const touching =
        Math.abs(cell.row - queen.row) <= 1 && Math.abs(cell.column - queen.column) <= 1

      if (sameRow || sameColumn || sameRegion || touching) {
        keys.add(createPositionKey(cell))
      }
    }
  }

  return keys
}

function getQueenCells(board: QueensBoardState): QueensCell[] {
  return board.cells.flat().filter((cell) => cell.value === 'queen')
}

function areQueensInConflict(firstQueen: QueensCell, secondQueen: QueensCell): boolean {
  const sameRow = firstQueen.row === secondQueen.row
  const sameColumn = firstQueen.column === secondQueen.column
  const sameRegion = firstQueen.regionId === secondQueen.regionId
  const touching =
    Math.abs(firstQueen.row - secondQueen.row) <= 1 &&
    Math.abs(firstQueen.column - secondQueen.column) <= 1

  return sameRow || sameColumn || sameRegion || touching
}

function createUpdatedCell(
  cell: QueensCell,
  value: QueensCellValue,
  xSource?: QueensXSource
): QueensCell {
  const updatedCell: QueensCell = {
    row: cell.row,
    column: cell.column,
    regionId: cell.regionId,
    value,
  }

  if (value === 'x' && xSource) {
    updatedCell.xSource = xSource
  }

  return updatedCell
}
