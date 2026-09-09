/**
 * Acceso a los packs de Sudoku precargados (public/levels/sudoku/) y
 * generación al vuelo para el modo aleatorio.
 *
 * "Siguiente" recorre el pack en orden y guarda el cursor por
 * variante+dificultad; "Aleatorio" arma un puzzle nuevo en el navegador, así
 * que nunca se acaban. Si un pack no se puede descargar (offline sin caché),
 * el juego cae a la generación local y sigue jugable.
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

const CURSOR_KEY_PREFIX = 'luzaron-sudoku-cursor-v1:'

let indexPromise: Promise<SudokuPackEntry[]> | null = null
const packPromises = new Map<string, Promise<StoredSudokuPack>>()

function packKey(variant: SudokuVariant, difficulty: SudokuDifficulty): string {
  return `${variant}-${difficulty}`
}

export function loadSudokuIndex(): Promise<SudokuPackEntry[]> {
  if (!indexPromise) {
    indexPromise = fetch('/levels/sudoku/index.json')
      .then((response) => {
        if (!response.ok) throw new Error(`No se pudo cargar el índice de Sudoku (${response.status})`)
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

function readCursor(key: string): number {
  const raw = window.localStorage.getItem(CURSOR_KEY_PREFIX + key)
  const value = raw ? Number(raw) : 0

  return Number.isFinite(value) && value >= 0 ? value : 0
}

function writeCursor(key: string, index: number): void {
  try {
    window.localStorage.setItem(CURSOR_KEY_PREFIX + key, String(index))
  } catch {
    // Sin almacenamiento: solo se pierde el avance dentro del pack.
  }
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

/** Siguiente puzzle precargado, en orden y recordando dónde se quedó. */
export async function pickSequentialSudoku(
  variant: SudokuVariant,
  difficulty: SudokuDifficulty,
  advance = true
): Promise<PickedSudoku> {
  const key = packKey(variant, difficulty)

  try {
    const pack = await loadPack(variant, difficulty)

    if (pack.puzzles.length === 0) throw new Error('Pack vacío')

    const cursor = readCursor(key) % pack.puzzles.length
    const stored = pack.puzzles[cursor]

    if (advance) writeCursor(key, (cursor + 1) % pack.puzzles.length)

    return {
      puzzle: toSudokuPuzzle(stored),
      puzzleNumber: cursor + 1,
      puzzleCount: pack.puzzles.length,
    }
  } catch {
    // Offline o pack ausente: mejor generar uno que dejar al jugador sin juego.
    return generateFreshSudoku(variant, difficulty)
  }
}
