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
      ${board.cells.map((row) => row.map((cell) => renderQueensCell(cell, conflictKeys)).join('')).join('')}
    </div>
  `
}

function renderQueensCell(cell: QueensCell, conflictKeys: Set<string>): string {
  const isConflictingQueen = cell.value === 'queen' && conflictKeys.has(createPositionKey(cell))
  const xSourceClass = cell.value === 'x' && cell.xSource ? `x-${cell.xSource}` : ''

  return `
    <button
      type="button"
      class="queens-cell region-${normalizeRegionClass(cell.regionId)} cell-${cell.value} ${xSourceClass} ${
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

function renderCellValue(cell: QueensCell): string {
  if (cell.value === 'queen') return '♕'
  if (cell.value === 'x') return '×'

  return ''
}

function normalizeRegionClass(regionId: string): string {
  return regionId.toLowerCase().replace(/[^a-z0-9-]/g, '-')
}
