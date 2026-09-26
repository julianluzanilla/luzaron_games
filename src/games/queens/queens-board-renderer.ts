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
  if (!rightNeighbor) classes.push('last-col')
  if (!bottomNeighbor) classes.push('last-row')

  return classes
}

/** Corona de esquinas rectas (rediseño Modernist). */
const QUEEN_ICON = `
  <svg class="cell-icon" viewBox="-1 -2 22 24" fill="currentColor" aria-hidden="true">
    <path d="M0 15.5L1.6 2.5 7.5 9.5 10 0.8 12.5 9.5 18.4 2.5 20 15.5Z" />
    <rect x="0.6" y="17" width="18.8" height="3.4" />
    <circle cx="1.6" cy="2.5" r="1.8" />
    <circle cx="10" cy="0.8" r="2" />
    <circle cx="18.4" cy="2.5" r="1.8" />
  </svg>
`

const X_ICON = `
  <svg class="cell-icon" viewBox="0 0 10 10" fill="none" aria-hidden="true">
    <path d="M0 0l10 10M10 0L0 10" stroke="currentColor" stroke-width="2" />
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
