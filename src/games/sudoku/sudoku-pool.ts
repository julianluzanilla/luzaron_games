/**
 * Acceso a los packs de Sudoku precargados (public/levels/sudoku/) y
 * generación al vuelo para el modo aleatorio.
 *
 * "Siguiente" toma uno al azar que no se haya jugado (por variante+dificultad)
 * y lo transforma (dígitos, filas, columnas) para que no se vea igual. Si un
 * pack no se puede descargar (offline sin caché), se genera uno local.
 */

import { generateSudokuPuzzle } from './sudoku-generator'
import type {
  StoredSudokuPack,
  SudokuDifficulty,
  SudokuPackEntry,
  SudokuPackIndex,
  SudokuPuzzle,
  SudokuVariant,
} from './sudoku-types'
import { toSudokuPuzzle } from './sudoku-types'
import { transformSudokuPuzzle } from './sudoku-symmetry'
import { pickUnseen } from '../../shell/pick-unseen'

const SEEN_KEY_PREFIX = 'luzaron-sudoku-seen-v1:'

let indexPromise: Promise<SudokuPackEntry[]> | null = null
const packPromises = new Map<string, Promise<StoredSudokuPack>>()

function packKey(variant: SudokuVariant, difficulty: SudokuDifficulty): string {
  return `${variant}-${difficulty}`
}

export function loadSudokuIndex(): Promise<SudokuPackEntry[]> {
  if (!indexPromise) {
    indexPromise = fetch('/levels/sudoku/index.json')
      .then((response) => {
        if (!response.ok)
          throw new Error(`No se pudo cargar el índice de Sudoku (${response.status})`)
        return response.json() as Promise<SudokuPackIndex>
      })
      .then((data) => data.packs)
      .catch(() => [])
  }

  return indexPromise
}

function loadPack(variant: SudokuVariant, difficulty: SudokuDifficulty): Promise<StoredSudokuPack> {
  const key = packKey(variant, difficulty)
  let promise = packPromises.get(key)

  if (!promise) {
    promise = fetch(`/levels/sudoku/sudoku-${key}.json`).then((response) => {
      if (!response.ok) throw new Error(`No se pudo cargar el pack de Sudoku ${key}`)
      return response.json() as Promise<StoredSudokuPack>
    })

    packPromises.set(key, promise)
  }

  return promise
}

export interface PickedSudoku {
  puzzle: SudokuPuzzle
  /** Posición dentro del pack, o 0 si se generó al vuelo. */
  puzzleNumber: number
  /** Tamaño del pack, o 0 si se generó al vuelo. */
  puzzleCount: number
}

/** Genera un puzzle nuevo en el navegador. Nunca falla por falta de red. */
export function generateFreshSudoku(
  variant: SudokuVariant,
  difficulty: SudokuDifficulty
): PickedSudoku {
  return {
    puzzle: generateSudokuPuzzle({ variant, difficulty }),
    puzzleNumber: 0,
    puzzleCount: 0,
  }
}

/** Puzzle precargado al azar, sin repetir hasta acabar el pack. */
export async function pickRandomSudoku(
  variant: SudokuVariant,
  difficulty: SudokuDifficulty
): Promise<PickedSudoku> {
  try {
    const pack = await loadPack(variant, difficulty)

    if (pack.puzzles.length === 0) throw new Error('Pack vacío')

    const index = pickUnseen(SEEN_KEY_PREFIX + packKey(variant, difficulty), pack.puzzles, (p) => p.id)

    return {
      puzzle: transformSudokuPuzzle(toSudokuPuzzle(pack.puzzles[index])),
      puzzleNumber: index + 1,
      puzzleCount: pack.puzzles.length,
    }
  } catch {
    // Offline o pack ausente: mejor generar uno que dejar al jugador sin juego.
    return generateFreshSudoku(variant, difficulty)
  }
}
