import { createPositionKey, getQueensConflictKeys } from './queens-engine'
import type { QueensBoardState, QueensCell } from './queens-types'

export function renderQueensBoard(board: QueensBoardState): string {
  const conflictKeys = getQueensConflictKeys(board)

  return `
    <div
      class="queens-board queens-board-${board.size}"
      style="--queens-size: ${board.size};"
      aria-label="${board.title}"
    >
      ${board.cells
        .map((row) => row.map((cell) => renderQueensCell(cell, board, conflictKeys)).join(''))
        .join('')}
    </div>
  `
}

function renderQueensCell(
  cell: QueensCell,
  board: QueensBoardState,
  conflictKeys: Set<string>
): string {
  const isConflictingQueen = cell.value === 'queen' && conflictKeys.has(createPositionKey(cell))
  const xSourceClass = cell.value === 'x' && cell.xSource ? `x-${cell.xSource}` : ''
  const boundaryClasses = regionBoundaryClasses(cell, board).join(' ')

  return `
    <button
      type="button"
      class="queens-cell region-${normalizeRegionClass(cell.regionId)} cell-${cell.value} ${xSourceClass} ${boundaryClasses} ${
        isConflictingQueen ? 'cell-conflict' : ''
      }"
      data-action="queens-cell"
      data-row="${cell.row}"
      data-column="${cell.column}"
      data-region="${cell.regionId}"
      aria-label="Fila ${cell.row + 1}, columna ${cell.column + 1}"
    >
      ${renderCellValue(cell)}
    </button>
  `
}

/**
 * Every internal boundary between two different regions gets a bold border.
 * To avoid doubling it up (each of the two neighbouring cells would otherwise
 * both draw a thick edge on the shared line), only the top/left cell of each
 * pair claims it, via its right/bottom edge. Combined with the board's outer
 * frame, this makes every region read as its own bordered shape.
 */
function regionBoundaryClasses(cell: QueensCell, board: QueensBoardState): string[] {
  const classes: string[] = []
  const { row, column, regionId } = cell

  const rightNeighbor = column < board.size - 1 ? board.cells[row][column + 1] : null
  const bottomNeighbor = row < board.size - 1 ? board.cells[row + 1][column] : null

  if (rightNeighbor && rightNeighbor.regionId !== regionId) classes.push('edge-region-right')
  if (bottomNeighbor && bottomNeighbor.regionId !== regionId) classes.push('edge-region-bottom')

  return classes
}

function renderCellValue(cell: QueensCell): string {
  if (cell.value === 'queen') return '♕'
  if (cell.value === 'x') return '×'

  return ''
}

function normalizeRegionClass(regionId: string): string {
  return regionId.toLowerCase().replace(/[^a-z0-9-]/g, '-')
}
