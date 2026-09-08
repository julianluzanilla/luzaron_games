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

const QUEEN_ICON = `
  <svg class="cell-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="3" y="13" width="18" height="6" rx="1" />
    <polygon points="3,13 5.5,5 8.5,11 12,3 15.5,11 18.5,5 21,13" />
    <circle cx="5.5" cy="5" r="1.6" />
    <circle cx="12" cy="3" r="1.8" />
    <circle cx="18.5" cy="5" r="1.6" />
  </svg>
`

const X_ICON = `
  <svg class="cell-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <line x1="5" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" />
    <line x1="19" y1="5" x2="5" y2="19" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" />
  </svg>
`

function renderCellValue(cell: QueensCell): string {
  if (cell.value === 'queen') return QUEEN_ICON
  if (cell.value === 'x') return X_ICON

  return ''
}

function normalizeRegionClass(regionId: string): string {
  return regionId.toLowerCase().replace(/[^a-z0-9-]/g, '-')
}
