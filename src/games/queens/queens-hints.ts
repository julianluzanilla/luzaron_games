import { createPositionKey, getQueensConflictKeys } from './queens-engine'
import type { QueensBoardState, QueensPosition } from './queens-types'

export type QueensHintKind =
  | 'wrong-queen'
  | 'wrong-x'
  | 'missing-row'
  | 'missing-column'
  | 'missing-region'
  | 'reveal-cell'

export interface QueensHint {
  kind: QueensHintKind
  message: string
  /** Cell to highlight, when the hint points at a specific cell. */
  position: QueensPosition | null
}

/**
 * Escalating hint tiers: while the board doesn't change, pressing Hint again
 * for the same target row walks through row -> column -> region -> exact
 * cell, matching PRODUCT_SPEC.md's priority list (steps 3-6).
 */
export function getQueensHint(board: QueensBoardState, tier: number): QueensHint {
  const conflictKeys = getQueensConflictKeys(board)

  for (const row of board.cells) {
    for (const cell of row) {
      if (cell.value === 'queen' && conflictKeys.has(createPositionKey(cell))) {
        return {
          kind: 'wrong-queen',
          message: 'Hay una reina que no puede quedarse ahí: revisa su fila, columna y región.',
          position: { row: cell.row, column: cell.column },
        }
      }
    }
  }

  const solutionSet = new Set(board.solution.map((position) => createPositionKey(position)))

  for (const row of board.cells) {
    for (const cell of row) {
      if (cell.value === 'x' && cell.xSource === 'manual' && solutionSet.has(createPositionKey(cell))) {
        return {
          kind: 'wrong-x',
          message: 'Esa X está tapando una celda donde sí debería ir una reina.',
          position: { row: cell.row, column: cell.column },
        }
      }
    }
  }

  const placedRows = new Set(
    board.cells.flatMap((row) => row.filter((cell) => cell.value === 'queen').map((cell) => cell.row))
  )

  const missingRow = board.solution.find((position) => !placedRows.has(position.row))

  if (!missingRow) {
    return {
      kind: 'reveal-cell',
      message: '¡Ya casi! Revisa que no falte ninguna reina.',
      position: null,
    }
  }

  const regionId = board.cells[missingRow.row][missingRow.column].regionId

  if (tier <= 1) {
    return {
      kind: 'missing-row',
      message: `Falta una reina en la fila ${missingRow.row + 1}.`,
      position: { row: missingRow.row, column: missingRow.column },
    }
  }

  if (tier === 2) {
    return {
      kind: 'missing-column',
      message: `Falta una reina en la columna ${missingRow.column + 1}.`,
      position: { row: missingRow.row, column: missingRow.column },
    }
  }

  if (tier === 3) {
    return {
      kind: 'missing-region',
      message: `Falta una reina en la región ${Number(regionId) + 1}.`,
      position: { row: missingRow.row, column: missingRow.column },
    }
  }

  return {
    kind: 'reveal-cell',
    message: 'Aquí debe ir una reina.',
    position: { row: missingRow.row, column: missingRow.column },
  }
}
