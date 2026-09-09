/**
 * Dibujado del tablero y del teclado numérico.
 *
 * Devuelve HTML como string, igual que Queens y Wordle. Todos los colores
 * salen de variables CSS (--sudoku-*), así que el tema claro/oscuro se
 * resuelve por completo en style.css sin tocar este archivo.
 */

import { remainingForDigit, type SudokuBoardState } from './sudoku-engine'
import { getUnits } from './sudoku-solver'
import { boxOf, columnOf, rowOf } from './sudoku-types'

export interface SudokuRenderOptions {
  selected: number | null
  conflicts: Set<number>
  /** Celdas con el destello de fila/columna/caja completada. */
  flashing: Set<number>
  /** Celda señalada por la última pista. */
  hinted: number | null
}

function cellClasses(state: SudokuBoardState, index: number, options: SudokuRenderOptions): string {
  const { geometry } = state
  const value = state.values[index]
  const classes = ['sudoku-cell']

  if (state.given[index]) classes.push('cell-given')
  else if (state.revealed[index]) classes.push('cell-revealed')
  else if (value !== 0) classes.push('cell-user')
  else classes.push('cell-empty')

  if (options.conflicts.has(index)) classes.push('cell-conflict')
  if (options.flashing.has(index)) classes.push('cell-flash')
  if (options.hinted === index) classes.push('cell-hinted')

  if (options.selected !== null) {
    const { peers } = getUnits(geometry)
    const selectedValue = state.values[options.selected]

    if (options.selected === index) classes.push('cell-selected')
    else if (peers[options.selected].includes(index)) classes.push('cell-peer')

    if (value !== 0 && value === selectedValue) classes.push('cell-same-value')
  }

  // Líneas gruesas entre cajas.
  const row = rowOf(geometry, index)
  const column = columnOf(geometry, index)

  if (column % geometry.boxCols === geometry.boxCols - 1 && column !== geometry.size - 1) {
    classes.push('box-edge-right')
  }

  if (row % geometry.boxRows === geometry.boxRows - 1 && row !== geometry.size - 1) {
    classes.push('box-edge-bottom')
  }

  return classes.join(' ')
}

export function renderSudokuBoard(state: SudokuBoardState, options: SudokuRenderOptions): string {
  const { geometry } = state

  const cells = state.values
    .map((value, index) => {
      const label = value === 0 ? '' : String(value)
      const row = rowOf(geometry, index) + 1
      const column = columnOf(geometry, index) + 1

      return `
        <button
          type="button"
          class="${cellClasses(state, index, options)}"
          data-action="sudoku-cell"
          data-index="${index}"
          data-box="${boxOf(geometry, index)}"
          aria-label="Fila ${row}, columna ${column}${value === 0 ? ', vacía' : `, ${value}`}"
          ${state.given[index] ? 'aria-readonly="true"' : ''}
        ><span class="sudoku-value">${label}</span></button>
      `
    })
    .join('')

  return `
    <div
      class="sudoku-board sudoku-board-${geometry.size}"
      style="--sudoku-size: ${geometry.size}"
      role="grid"
      aria-label="Tablero de Sudoku"
    >${cells}</div>
  `
}

export function renderSudokuPad(state: SudokuBoardState): string {
  const digits = Array.from({ length: state.geometry.size }, (_, i) => i + 1)

  const buttons = digits
    .map((digit) => {
      const remaining = remainingForDigit(state, digit)

      return `
        <button
          type="button"
          class="sudoku-key ${remaining === 0 ? 'key-done' : ''}"
          data-action="sudoku-digit"
          data-digit="${digit}"
          aria-label="Escribir ${digit}"
        >
          <span class="sudoku-key-digit">${digit}</span>
          <span class="sudoku-key-left">${remaining}</span>
        </button>
      `
    })
    .join('')

  return `
    <div class="sudoku-pad" role="group" aria-label="Teclado numérico">
      ${buttons}
      <button type="button" class="sudoku-key sudoku-key-erase" data-action="sudoku-erase" aria-label="Borrar">
        <span class="sudoku-key-digit">⌫</span>
        <span class="sudoku-key-left">Borrar</span>
      </button>
    </div>
  `
}
