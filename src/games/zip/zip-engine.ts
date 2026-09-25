/**
 * Reglas de Zip durante la partida.
 *
 * El trazo es la lista de celdas en orden. Todo lo que hace el jugador se
 * reduce a tres operaciones: **avanzar** una celda desde la punta,
 * **recortar** el trazo hasta una celda que ya es suya y **empezar** en el 1.
 * `tryStep` dice si un avance es legal y, si no, por qué (para el aviso de
 * error de la pantalla).
 */

import { edgeBetween, type ZipPuzzle } from './zip-types'

export type StepBlock = 'wall' | 'order' | 'occupied' | 'not-adjacent' | 'finished'

export type StepResult = { ok: true } | { ok: false; reason: StepBlock; wall?: number }

export interface ZipGame {
  puzzle: ZipPuzzle
  walls: Set<number>
  /** Número (1…K) de cada celda, 0 si no tiene. */
  numberAt: Int16Array
}

export function createZipGame(puzzle: ZipPuzzle): ZipGame {
  const total = puzzle.size * puzzle.size
  const numberAt = new Int16Array(total)
  puzzle.numbers.forEach((cell, index) => {
    numberAt[cell] = index + 1
  })

  return { puzzle, walls: new Set(puzzle.walls), numberAt }
}

/** Siguiente número que el trazo tiene que tocar. */
export function nextNumber(game: ZipGame, path: number[]): number {
  let reached = 0
  for (const cell of path) if (game.numberAt[cell] !== 0) reached += 1
  return reached + 1
}

export function canStart(game: ZipGame, cell: number): boolean {
  return cell === game.puzzle.numbers[0]
}

/** ¿Se puede avanzar de la punta a `cell`? */
export function tryStep(game: ZipGame, path: number[], cell: number): StepResult {
  const { size, numbers } = game.puzzle
  const tip = path[path.length - 1]
  const lastNumber = numbers.length

  if (tip === undefined) return { ok: false, reason: 'not-adjacent' }

  // Llegar a K cierra el trazo: ya no se puede seguir desde ahí.
  if (game.numberAt[tip] === lastNumber) return { ok: false, reason: 'finished' }

  const edge = edgeBetween(size, tip, cell)
  if (edge === -1) return { ok: false, reason: 'not-adjacent' }
  if (game.walls.has(edge)) return { ok: false, reason: 'wall', wall: edge }
  if (path.includes(cell)) return { ok: false, reason: 'occupied' }

  const value = game.numberAt[cell]
  if (value !== 0 && value !== nextNumber(game, path)) return { ok: false, reason: 'order' }

  return { ok: true }
}

export function isZipSolved(game: ZipGame, path: number[]): boolean {
  const { size, numbers } = game.puzzle

  return path.length === size * size && path[path.length - 1] === numbers[numbers.length - 1]
}

/**
 * Pista de una celda: el prefijo más largo del trazo que coincide con la
 * solución y la celda que sigue. El trazo se recorta a ese prefijo y la celda
 * siguiente se marca; el jugador es quien avanza.
 */
export function hintFor(game: ZipGame, path: number[]): { keep: number; cell: number } | null {
  const { solution } = game.puzzle
  let keep = 0

  while (keep < path.length && path[keep] === solution[keep]) keep += 1

  if (keep >= solution.length) return null

  // Sin trazo, la primera "celda siguiente" es el propio 1.
  return { keep, cell: solution[keep] }
}
