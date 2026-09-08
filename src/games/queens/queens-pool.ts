import type { StoredQueensPack, StoredQueensPuzzle } from './queens-level'

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
        if (!response.ok) throw new Error(`No se pudo cargar el índice de puzzles (${response.status})`)
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

function readSeenIds(size: number): Set<string> {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY_PREFIX + size)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

function writeSeenIds(size: number, seen: Set<string>): void {
  try {
    window.localStorage.setItem(SEEN_KEY_PREFIX + size, JSON.stringify([...seen]))
  } catch {
    // Ignore storage failures (e.g. private browsing) — repeats are a minor inconvenience.
  }
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

  let seen = readSeenIds(size)
  let unseen = pack.puzzles.filter((puzzle) => !seen.has(puzzle.id))

  if (unseen.length === 0) {
    // Played through the whole pool for this size — start a fresh lap.
    seen = new Set()
    unseen = pack.puzzles
  }

  const chosen = unseen[Math.floor(Math.random() * unseen.length)]

  seen.add(chosen.id)
  writeSeenIds(size, seen)

  const puzzleNumber = pack.puzzles.findIndex((puzzle) => puzzle.id === chosen.id) + 1

  return { puzzle: chosen, puzzleNumber }
}
