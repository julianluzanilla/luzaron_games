/**
 * Tipos y constantes compartidas por el Sudoku.
 *
 * El tablero siempre se maneja como un arreglo plano de longitud size*size,
 * donde 0 significa celda vacía. Las dos variantes comparten absolutamente
 * toda la lógica; lo único que cambia es la geometría de las cajas.
 */

export type SudokuVariant = 'mini' | 'classic'
export type SudokuDifficulty = 'easy' | 'normal' | 'hard'

export interface SudokuGeometry {
  /** Lado del tablero (6 o 9). */
  size: number
  /** Alto de cada caja en celdas. */
  boxRows: number
  /** Ancho de cada caja en celdas. */
  boxCols: number
  /** Cuántas cajas caben a lo ancho del tablero. */
  boxesAcross: number
  /** size * size. */
  cellCount: number
}

export const SUDOKU_GEOMETRY: Record<SudokuVariant, SudokuGeometry> = {
  // 6x6: cajas de 3 de ancho por 2 de alto (el estándar del Mini Sudoku).
  mini: { size: 6, boxRows: 2, boxCols: 3, boxesAcross: 2, cellCount: 36 },
  classic: { size: 9, boxRows: 3, boxCols: 3, boxesAcross: 3, cellCount: 81 },
}

export const SUDOKU_VARIANTS: SudokuVariant[] = ['mini', 'classic']
export const SUDOKU_DIFFICULTIES: SudokuDifficulty[] = ['easy', 'normal', 'hard']

export const VARIANT_LABELS: Record<SudokuVariant, string> = {
  mini: 'Mini 6×6',
  classic: 'Clásico 9×9',
}

export const DIFFICULTY_LABELS: Record<SudokuDifficulty, string> = {
  easy: 'Fácil',
  normal: 'Normal',
  hard: 'Difícil',
}

export interface GivensRange {
  min: number
  max: number
}

/**
 * Cuántos números visibles debe traer cada dificultad.
 *
 * El conteo es solo la primera mitad del criterio: el generador además
 * califica el puzzle con un solucionador lógico (ver sudoku-solver.ts) y
 * exige que las técnicas necesarias correspondan a la dificultad pedida.
 */
export const GIVENS_RANGE: Record<SudokuVariant, Record<SudokuDifficulty, GivensRange>> = {
  mini: {
    easy: { min: 18, max: 22 },
    normal: { min: 14, max: 17 },
    hard: { min: 10, max: 13 },
  },
  classic: {
    easy: { min: 38, max: 45 },
    normal: { min: 30, max: 35 },
    hard: { min: 24, max: 29 },
  },
}

export interface SudokuPuzzle {
  id: string
  variant: SudokuVariant
  difficulty: SudokuDifficulty
  /** Tablero inicial: 0 = celda vacía. */
  givens: number[]
  /** Solución completa y única. */
  solution: number[]
}

/** Igual que SudokuPuzzle, pero con las rejillas como texto para el JSON. */
export interface StoredSudokuPuzzle {
  id: string
  variant: SudokuVariant
  difficulty: SudokuDifficulty
  givens: string
  solution: string
}

export interface StoredSudokuPack {
  variant: SudokuVariant
  difficulty: SudokuDifficulty
  generatedAt: string
  puzzles: StoredSudokuPuzzle[]
}

export interface SudokuPackEntry {
  variant: SudokuVariant
  difficulty: SudokuDifficulty
  count: number
}

export interface SudokuPackIndex {
  packs: SudokuPackEntry[]
}

export function gridToString(grid: number[]): string {
  return grid.join('')
}

export function gridFromString(text: string): number[] {
  return [...text].map((char) => Number(char))
}

export function toSudokuPuzzle(stored: StoredSudokuPuzzle): SudokuPuzzle {
  return {
    id: stored.id,
    variant: stored.variant,
    difficulty: stored.difficulty,
    givens: gridFromString(stored.givens),
    solution: gridFromString(stored.solution),
  }
}

export function toStoredSudokuPuzzle(puzzle: SudokuPuzzle): StoredSudokuPuzzle {
  return {
    id: puzzle.id,
    variant: puzzle.variant,
    difficulty: puzzle.difficulty,
    givens: gridToString(puzzle.givens),
    solution: gridToString(puzzle.solution),
  }
}

export function getGeometry(variant: SudokuVariant): SudokuGeometry {
  return SUDOKU_GEOMETRY[variant]
}

export function rowOf(geometry: SudokuGeometry, index: number): number {
  return Math.floor(index / geometry.size)
}

export function columnOf(geometry: SudokuGeometry, index: number): number {
  return index % geometry.size
}

export function boxOf(geometry: SudokuGeometry, index: number): number {
  const row = rowOf(geometry, index)
  const column = columnOf(geometry, index)

  return Math.floor(row / geometry.boxRows) * geometry.boxesAcross + Math.floor(column / geometry.boxCols)
}
