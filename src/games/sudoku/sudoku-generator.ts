/**
 * Generador de puzzles de Sudoku.
 *
 * Receta: se arma una solución completa al azar, se van quitando números en
 * pares simétricos (180°) y después de cada intento se verifica que el
 * tablero siga teniendo **una sola solución**. Al final se califica con el
 * solucionador lógico y solo se acepta si la dificultad coincide con la
 * pedida. Esto corre igual en el navegador (modo aleatorio) y en el script
 * que genera los packs precargados.
 */

import { countSolutions, gradePuzzle, solveOnce } from './sudoku-solver'
import type { SudokuDifficulty, SudokuGeometry, SudokuPuzzle, SudokuVariant } from './sudoku-types'
import { GIVENS_RANGE, getGeometry } from './sudoku-types'

export type RandomFn = () => number

/** PRNG determinista, para que un pack se pueda regenerar igual. */
export function mulberry32(seed: number): RandomFn {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(items: T[], random: RandomFn): T[] {
  const copy = items.slice()

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }

  return copy
}

/** Tablero lleno y válido, elegido al azar. */
export function generateSolution(geometry: SudokuGeometry, random: RandomFn): number[] {
  const digits = Array.from({ length: geometry.size }, (_, i) => i + 1)
  const grid = new Array<number>(geometry.cellCount).fill(0)

  // Sembrar la primera fila al azar acelera muchísimo el backtracking y ya
  // garantiza variedad; el resto lo completa el solucionador.
  const firstRow = shuffle(digits, random)

  for (let column = 0; column < geometry.size; column += 1) grid[column] = firstRow[column]

  const solved = solveOnce(grid, geometry)

  if (!solved) throw new Error('No se pudo generar una solución de Sudoku')

  return solved
}

/** Índice simétrico respecto al centro del tablero (rotación de 180°). */
function mirrorIndex(geometry: SudokuGeometry, index: number): number {
  return geometry.cellCount - 1 - index
}

function digHoles(
  solution: number[],
  geometry: SudokuGeometry,
  targetGivens: number,
  random: RandomFn
): number[] {
  const grid = solution.slice()
  let givens = geometry.cellCount

  const order = shuffle(
    Array.from({ length: geometry.cellCount }, (_, index) => index),
    random
  )

  // Primera pasada: quitar de a dos (simétrico), que se ve mucho mejor.
  for (const index of order) {
    if (givens <= targetGivens + 1) break
    if (grid[index] === 0) continue

    const mirror = mirrorIndex(geometry, index)
    const removed: number[] = [index]

    grid[index] = 0

    if (mirror !== index && grid[mirror] !== 0) {
      removed.push(mirror)
      grid[mirror] = 0
    }

    if (countSolutions(grid, geometry, 2) === 1) {
      givens -= removed.length
    } else {
      for (const cell of removed) grid[cell] = solution[cell]
    }
  }

  // Segunda pasada: rematar de a uno para llegar al objetivo exacto.
  for (const index of order) {
    if (givens <= targetGivens) break
    if (grid[index] === 0) continue

    grid[index] = 0

    if (countSolutions(grid, geometry, 2) === 1) {
      givens -= 1
    } else {
      grid[index] = solution[index]
    }
  }

  return grid
}

export interface GenerateOptions {
  variant: SudokuVariant
  difficulty: SudokuDifficulty
  random?: RandomFn
  /** Intentos antes de aceptar el mejor tablero disponible. */
  attempts?: number
  id?: string
}

/**
 * Calificación ideal de cada dificultad: la técnica más avanzada que debería
 * hacer falta. 'hard' incluye los tableros que el solucionador lógico no
 * termina con singles/pares — siguen teniendo solución única, solo piden más
 * cabeza.
 */
const PREFERRED_GRADE: Record<SudokuDifficulty, SudokuDifficulty> = {
  easy: 'easy',
  normal: 'normal',
  hard: 'hard',
}

/**
 * Calificaciones tolerables, en orden de preferencia, cuando no aparece la
 * ideal. En el 6×6 casi ningún tablero necesita candidatos bloqueados ni
 * pares —hay muy pocas celdas—, así que ahí la dificultad se apoya sobre
 * todo en cuántas pistas quedan visibles, tal como dice el PRODUCT_SPEC 12.2.
 */
const ACCEPTED_GRADES: Record<SudokuVariant, Record<SudokuDifficulty, SudokuDifficulty[]>> = {
  mini: {
    easy: ['easy'],
    normal: ['normal', 'easy'],
    hard: ['hard', 'normal', 'easy'],
  },
  classic: {
    easy: ['easy'],
    normal: ['normal', 'easy'],
    hard: ['hard', 'normal'],
  },
}

/** ¿Este tablero sirve para la dificultad pedida? Lo usa también el script de packs. */
export function isAcceptableGrade(
  variant: SudokuVariant,
  difficulty: SudokuDifficulty,
  grade: SudokuDifficulty
): boolean {
  return ACCEPTED_GRADES[variant][difficulty].includes(grade)
}

interface Candidate {
  givens: number[]
  solution: number[]
  /** Menor es mejor: mezcla qué tan lejos quedó la calificación y las pistas. */
  penalty: number
}

export function generateSudokuPuzzle(options: GenerateOptions): SudokuPuzzle {
  const { variant, difficulty } = options
  const random = options.random ?? Math.random
  const attempts = options.attempts ?? 40
  const geometry = getGeometry(variant)
  const range = GIVENS_RANGE[variant][difficulty]
  const accepted = ACCEPTED_GRADES[variant][difficulty]

  let best: Candidate | null = null

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const solution = generateSolution(geometry, random)
    const target = range.min + Math.floor(random() * (range.max - range.min + 1))
    const givens = digHoles(solution, geometry, target, random)
    const visible = givens.filter((value) => value !== 0).length
    const grade = gradePuzzle(givens, geometry)
    const withinRange = visible <= range.max

    // Coincidencia perfecta: la calificación ideal y el número de pistas.
    if (withinRange && grade.difficulty === PREFERRED_GRADE[difficulty]) {
      return buildPuzzle(options, givens, solution)
    }

    // Si no, se guarda el mejor intento: primero la calificación (según el
    // orden de preferencia) y después qué tanto se pasó de pistas.
    const rank = accepted.indexOf(grade.difficulty)
    const penalty = (rank === -1 ? 10 : rank) * 4 + Math.max(0, visible - range.max)

    if (!best || penalty < best.penalty) best = { givens, solution, penalty }
  }

  // Siempre hay algo que devolver: todos los intentos tienen solución única,
  // solo puede fallar la calificación exacta.
  if (!best) throw new Error(`No se pudo generar un Sudoku ${variant} ${difficulty}`)

  return buildPuzzle(options, best.givens, best.solution)
}

function buildPuzzle(options: GenerateOptions, givens: number[], solution: number[]): SudokuPuzzle {
  return {
    id: options.id ?? `sudoku-${options.variant}-${options.difficulty}-${Date.now().toString(36)}`,
    variant: options.variant,
    difficulty: options.difficulty,
    givens,
    solution,
  }
}
