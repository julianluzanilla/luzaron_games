/**
 * Estado de una partida de Sudoku y las reglas que operan sobre él.
 *
 * El motor no sabe nada de DOM ni de tiempos: recibe un estado y devuelve
 * otro. Los conflictos se calculan contra las reglas del juego (repetidos en
 * fila, columna o caja), nunca contra la solución guardada, para no delatar
 * un número que todavía es legal aunque esté equivocado.
 */

import { getUnits } from './sudoku-solver'
import type { SudokuGeometry, SudokuPuzzle } from './sudoku-types'
import { getGeometry } from './sudoku-types'

export interface SudokuBoardState {
  puzzle: SudokuPuzzle
  geometry: SudokuGeometry
  /** Lo que se ve en el tablero ahora. 0 = vacío. */
  values: number[]
  /** Celdas que venían con el puzzle: no se pueden editar. */
  given: boolean[]
  /** Celdas que llenó una pista: cuentan como del jugador pero se pintan aparte. */
  revealed: boolean[]
  /** Número de puzzle dentro del pack (0 = generado al vuelo). */
  puzzleNumber: number
}

export function createSudokuBoardState(puzzle: SudokuPuzzle, puzzleNumber = 0): SudokuBoardState {
  const geometry = getGeometry(puzzle.variant)

  return {
    puzzle,
    geometry,
    values: puzzle.givens.slice(),
    given: puzzle.givens.map((value) => value !== 0),
    revealed: new Array<boolean>(geometry.cellCount).fill(false),
    puzzleNumber,
  }
}

export function cloneSudokuBoardState(state: SudokuBoardState): SudokuBoardState {
  return {
    ...state,
    values: state.values.slice(),
    given: state.given.slice(),
    revealed: state.revealed.slice(),
  }
}

/** Vuelve el tablero a como estaba al inicio del puzzle. */
export function resetSudokuBoardState(state: SudokuBoardState): SudokuBoardState {
  return createSudokuBoardState(state.puzzle, state.puzzleNumber)
}

export function isEditable(state: SudokuBoardState, index: number): boolean {
  return !state.given[index]
}

/** Escribe (o borra, con 0) un número del jugador. */
export function setSudokuValue(state: SudokuBoardState, index: number, value: number): SudokuBoardState {
  if (!isEditable(state, index)) return state
  if (state.values[index] === value) return state

  const next = cloneSudokuBoardState(state)

  next.values[index] = value
  next.revealed[index] = false

  return next
}

/** Escribe el número correcto de una celda: lo usa el botón de pista. */
export function revealSudokuValue(state: SudokuBoardState, index: number): SudokuBoardState {
  if (!isEditable(state, index)) return state

  const next = cloneSudokuBoardState(state)

  next.values[index] = state.puzzle.solution[index]
  next.revealed[index] = true

  return next
}

/**
 * Celdas en conflicto: cualquier número repetido dentro de una misma fila,
 * columna o caja. Devuelve todas las celdas involucradas, incluidas las
 * precargadas, para que se vea contra qué está chocando el jugador.
 */
export function getSudokuConflicts(state: SudokuBoardState): Set<number> {
  const { units } = getUnits(state.geometry)
  const conflicts = new Set<number>()

  for (const unit of units) {
    const seen = new Map<number, number[]>()

    for (const index of unit) {
      const value = state.values[index]
      if (value === 0) continue

      const bucket = seen.get(value)

      if (bucket) bucket.push(index)
      else seen.set(value, [index])
    }

    for (const bucket of seen.values()) {
      if (bucket.length > 1) for (const index of bucket) conflicts.add(index)
    }
  }

  return conflicts
}

export function isSudokuSolved(state: SudokuBoardState): boolean {
  for (let index = 0; index < state.geometry.cellCount; index += 1) {
    if (state.values[index] !== state.puzzle.solution[index]) return false
  }

  return true
}

/** Cuántas veces falta escribir un dígito para completarlo en todo el tablero. */
export function remainingForDigit(state: SudokuBoardState, digit: number): number {
  let placed = 0

  for (let index = 0; index < state.geometry.cellCount; index += 1) {
    if (state.values[index] === digit) placed += 1
  }

  return Math.max(0, state.geometry.size - placed)
}

export type SudokuUnitKind = 'row' | 'column' | 'box'

export interface CompletedUnit {
  kind: SudokuUnitKind
  cells: number[]
}

function unitKindsOf(state: SudokuBoardState, index: number): CompletedUnit[] {
  const { unitsOf } = getUnits(state.geometry)
  const kinds: SudokuUnitKind[] = ['row', 'column', 'box']

  return unitsOf[index].map((cells, position) => ({ kind: kinds[position], cells }))
}

function isUnitComplete(state: SudokuBoardState, cells: number[]): boolean {
  const seen = new Set<number>()

  for (const index of cells) {
    const value = state.values[index]
    if (value === 0 || seen.has(value)) return false
    seen.add(value)
  }

  return seen.size === state.geometry.size
}

/**
 * Filas, columnas y cajas que quedaron completas y correctas **con esta
 * jugada** (estaban incompletas antes y ya no). Es lo que dispara el
 * highlight momentáneo de logro.
 */
export function getUnitsCompletedBy(
  before: SudokuBoardState,
  after: SudokuBoardState,
  index: number
): CompletedUnit[] {
  return unitKindsOf(after, index).filter(
    (unit) => isUnitComplete(after, unit.cells) && !isUnitComplete(before, unit.cells)
  )
}
