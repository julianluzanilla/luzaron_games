import type { StoredQueensPack, StoredQueensPuzzle } from './queens-level'
import { transformQueensPuzzle } from './queens-symmetry'
import { pickUnseen } from '../../shell/pick-unseen'

export interface PoolSizeEntry {
  size: number
  count: number
}

const SEEN_KEY_PREFIX = 'luzaron-queens-seen-v1:'

let indexPromise: Promise<PoolSizeEntry[]> | null = null
const packPromises = new Map<number, Promise<StoredQueensPack>>()

export function loadAvailableSizes(): Promise<PoolSizeEntry[]> {
  if (!indexPromise) {
    indexPromise = fetch('/levels/queens/index.json')
      .then((response) => {
        if (!response.ok)
          throw new Error(`No se pudo cargar el índice de puzzles (${response.status})`)
        return response.json() as Promise<{ sizes: PoolSizeEntry[] }>
      })
      .then((data) => data.sizes)
  }

  return indexPromise
}

function loadPack(size: number): Promise<StoredQueensPack> {
  let promise = packPromises.get(size)

  if (!promise) {
    promise = fetch(`/levels/queens/queens-${size}x${size}.json`).then((response) => {
      if (!response.ok) throw new Error(`No se pudo cargar el paquete de ${size}x${size}`)
      return response.json() as Promise<StoredQueensPack>
    })

    packPromises.set(size, promise)
  }

  return promise
}

export interface PickedPuzzle {
  puzzle: StoredQueensPuzzle
  puzzleNumber: number
}

export async function pickNextPuzzle(size: number): Promise<PickedPuzzle> {
  const pack = await loadPack(size)

  if (pack.puzzles.length === 0) {
    throw new Error(`No hay puzzles disponibles para ${size}x${size} todavía.`)
  }

  const index = pickUnseen(SEEN_KEY_PREFIX + size, pack.puzzles, (puzzle) => puzzle.id)
  const chosen = pack.puzzles[index]

  const puzzleNumber = index + 1

  // Random rotation/mirror so a replayed puzzle doesn't look the same.
  return { puzzle: transformQueensPuzzle(chosen, Math.floor(Math.random() * 8)), puzzleNumber }
}
