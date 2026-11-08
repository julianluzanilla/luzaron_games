/**
 * Packs precargados de Zip (public/levels/zip/) y generación al vuelo.
 *
 * "Siguiente" toma uno al azar que no se haya jugado (por tamaño) y lo rota o
 * espeja para que no se vea igual. Si el pack no se puede descargar (offline
 * sin caché) se cae a la generación local.
 */

import { generateZipPuzzle } from './zip-generator'
import { toZipPuzzle, type StoredZipPack, type ZipPuzzle, type ZipSize } from './zip-types'
import { transformZipPuzzle } from './zip-symmetry'
import { pickUnseen } from '../../shell/pick-unseen'

const SEEN_KEY_PREFIX = 'luzaron-zip-seen-v1:'

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

export interface PickedZip {
  puzzle: ZipPuzzle
  /** Posición dentro del pack (1…150), o 0 si se generó al vuelo. */
  puzzleNumber: number
  /** Tamaño del pack, o 0 si se generó al vuelo. */
  puzzleCount: number
}

export function generateFreshZip(size: ZipSize): PickedZip {
  return { puzzle: generateZipPuzzle({ size }), puzzleNumber: 0, puzzleCount: 0 }
}

/** Puzzle del pack al azar, sin repetir hasta acabar el tamaño. */
export async function pickRandomZip(size: ZipSize): Promise<PickedZip> {
  try {
    const pack = await loadPack(size)
    if (pack.puzzles.length === 0) throw new Error('Pack vacío')

    // The pack has no ids; the solution path is unique per puzzle.
    const index = pickUnseen(SEEN_KEY_PREFIX + size, pack.puzzles, (p) => p.path)

    return {
      puzzle: transformZipPuzzle(toZipPuzzle(size, pack.puzzles[index]), Math.floor(Math.random() * 8)),
      puzzleNumber: index + 1,
      puzzleCount: pack.puzzles.length,
    }
  } catch {
    return generateFreshZip(size)
  }
}
