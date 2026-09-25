/**
 * Packs precargados de Zip (public/levels/zip/) y generación al vuelo.
 *
 * Cada tamaño trae 150 puzzles **ordenados de menor a mayor puntaje**, así
 * que "Siguiente" va subiendo la dificultad poco a poco. El cursor se guarda
 * por tamaño. "Aleatorio" genera uno nuevo en el navegador. Si el pack no se
 * puede descargar (offline sin caché) se cae a la generación local.
 */

import { generateZipPuzzle } from './zip-generator'
import { toZipPuzzle, type StoredZipPack, type ZipPuzzle, type ZipSize } from './zip-types'

const CURSOR_KEY_PREFIX = 'luzaron-zip-cursor-v1:'

const packPromises = new Map<ZipSize, Promise<StoredZipPack>>()

function loadPack(size: ZipSize): Promise<StoredZipPack> {
  let promise = packPromises.get(size)

  if (!promise) {
    promise = fetch(`/levels/zip/zip-${size}x${size}.json`).then((response) => {
      if (!response.ok) throw new Error(`No se pudo cargar el pack de Zip ${size}×${size}`)
      return response.json() as Promise<StoredZipPack>
    })

    // Si falla no se queda cacheado el error: el siguiente intento vuelve a pedirlo.
    promise.catch(() => packPromises.delete(size))
    packPromises.set(size, promise)
  }

  return promise
}

function readCursor(size: ZipSize): number {
  try {
    const raw = window.localStorage.getItem(CURSOR_KEY_PREFIX + size)
    const value = raw ? Number(raw) : 0
    return Number.isFinite(value) && value >= 0 ? value : 0
  } catch {
    return 0
  }
}

function writeCursor(size: ZipSize, index: number): void {
  try {
    window.localStorage.setItem(CURSOR_KEY_PREFIX + size, String(index))
  } catch {
    // Sin almacenamiento: solo se pierde el avance dentro del pack.
  }
}

export interface PickedZip {
  puzzle: ZipPuzzle
  /** Posición dentro del pack (1…150), o 0 si se generó al vuelo. */
  puzzleNumber: number
  /** Tamaño del pack, o 0 si se generó al vuelo. */
  puzzleCount: number
}

/**
 * Al resolver el puzzle `puzzleNumber` del pack, el cursor pasa al que sigue:
 * al volver a entrar se retoma en el siguiente sin resolver.
 */
export function markZipSolved(size: ZipSize, puzzleNumber: number, puzzleCount: number): void {
  if (puzzleNumber <= 0 || puzzleCount <= 0) return
  if (readCursor(size) % puzzleCount !== puzzleNumber - 1) return

  writeCursor(size, puzzleNumber % puzzleCount)
}

export function generateFreshZip(size: ZipSize): PickedZip {
  return { puzzle: generateZipPuzzle({ size }), puzzleNumber: 0, puzzleCount: 0 }
}

/**
 * Puzzle del pack. `advance` pasa al siguiente; sin él se repite el que el
 * cursor marca (al entrar al juego o cambiar de tamaño se retoma donde iba).
 */
export async function pickSequentialZip(size: ZipSize, advance: boolean): Promise<PickedZip> {
  try {
    const pack = await loadPack(size)
    if (pack.puzzles.length === 0) throw new Error('Pack vacío')

    let cursor = readCursor(size) % pack.puzzles.length
    if (advance) {
      cursor = (cursor + 1) % pack.puzzles.length
      writeCursor(size, cursor)
    }

    return {
      puzzle: toZipPuzzle(size, pack.puzzles[cursor]),
      puzzleNumber: cursor + 1,
      puzzleCount: pack.puzzles.length,
    }
  } catch {
    return generateFreshZip(size)
  }
}
