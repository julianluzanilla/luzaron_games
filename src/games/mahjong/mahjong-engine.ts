/**
 * Motor del Mahjong Solitario: qué ficha está libre, qué parejas quedan y
 * cómo se quitan y se devuelven.
 *
 * Una ficha está libre si no tiene nada encima y además tiene despejado el
 * lado izquierdo o el derecho. Quitar una ficha nunca bloquea a otra, así que
 * dos fichas libres a la vez siempre se pueden quitar en cualquier orden: de
 * ahí sale la garantía del reparto resoluble del generador.
 */

import type { MahjongBoardState, MahjongSlot, MahjongTile } from './mahjong-types'

/** Dos huecos se pisan si sus cuadrados de 2×2 se solapan. */
function overlaps(a: MahjongSlot, b: MahjongSlot): boolean {
  return Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2
}

export function isCovered(board: MahjongBoardState, tile: MahjongTile): boolean {
  return board.tiles.some(
    (other) => !other.removed && other.slot.z === tile.slot.z + 1 && overlaps(other.slot, tile.slot)
  )
}

export function isFree(board: MahjongBoardState, tile: MahjongTile): boolean {
  if (tile.removed) return false
  if (isCovered(board, tile)) return false

  let blockedLeft = false
  let blockedRight = false

  for (const other of board.tiles) {
    if (other.removed || other.index === tile.index) continue
    if (other.slot.z !== tile.slot.z) continue
    if (Math.abs(other.slot.y - tile.slot.y) >= 2) continue

    const dx = other.slot.x - tile.slot.x

    if (dx < 0 && dx >= -2) blockedLeft = true
    if (dx > 0 && dx <= 2) blockedRight = true

    if (blockedLeft && blockedRight) return false
  }

  return !blockedLeft || !blockedRight
}

export function freeTiles(board: MahjongBoardState): MahjongTile[] {
  return board.tiles.filter((tile) => isFree(board, tile))
}

export function canMatch(a: MahjongTile, b: MahjongTile): boolean {
  return a.index !== b.index && a.face.matchKey === b.face.matchKey
}

/** Todas las parejas jugables ahora mismo, sin repetir. */
export function listAvailablePairs(board: MahjongBoardState): Array<[MahjongTile, MahjongTile]> {
  const free = freeTiles(board)
  const pairs: Array<[MahjongTile, MahjongTile]> = []

  for (let i = 0; i < free.length; i += 1) {
    for (let j = i + 1; j < free.length; j += 1) {
      if (canMatch(free[i], free[j])) pairs.push([free[i], free[j]])
    }
  }

  return pairs
}

/** Primera pareja jugable, o null si el tablero está trabado. */
export function findAvailablePair(board: MahjongBoardState): [MahjongTile, MahjongTile] | null {
  const pairs = listAvailablePairs(board)

  return pairs.length > 0 ? pairs[0] : null
}

/** Cuántas parejas distintas hay disponibles ahora mismo. */
export function countAvailablePairs(board: MahjongBoardState): number {
  return listAvailablePairs(board).length
}

export function removePair(board: MahjongBoardState, first: number, second: number): void {
  board.tiles[first].removed = true
  board.tiles[second].removed = true
  board.history.push([first, second])
}

export function undoLastPair(board: MahjongBoardState): [number, number] | null {
  const last = board.history.pop()

  if (!last) return null

  board.tiles[last[0]].removed = false
  board.tiles[last[1]].removed = false

  return last
}

export function isSolved(board: MahjongBoardState): boolean {
  return board.tiles.every((tile) => tile.removed)
}
