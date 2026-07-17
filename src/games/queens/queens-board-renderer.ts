import type { QueensBoardState, QueensCell } from './queens-types'

export function renderQueensBoard(board: QueensBoardState): string {
  return `
    <div
      class="queens-board"
      style="--queens-size: ${board.size};"
      aria-label="${board.title}"
    >
      ${board.cells.map((row) => row.map(renderQueensCell).join('')).join('')}
    </div>
  `
}

function renderQueensCell(cell: QueensCell): string {
  return `
    <button
      type="button"
      class="queens-cell region-${normalizeRegionClass(cell.regionId)}"
      data-row="${cell.row}"
      data-column="${cell.column}"
      data-region="${cell.regionId}"
      aria-label="Fila ${cell.row + 1}, columna ${cell.column + 1}"
      disabled
    >
      ${renderCellValue(cell)}
    </button>
  `
}

function renderCellValue(cell: QueensCell): string {
  if (cell.value === 'queen') return '♛'
  if (cell.value === 'x') return '×'

  return ''
}

function normalizeRegionClass(regionId: string): string {
  return regionId.toLowerCase().replace(/[^a-z0-9-]/g, '-')
}
