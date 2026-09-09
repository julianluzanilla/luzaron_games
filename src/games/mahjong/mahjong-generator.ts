/**
 * Reparto de fichas con solución garantizada.
 *
 * El truco es construir la partida al revés: se parte del tablero lleno de
 * huecos y, en cada paso, se eligen dos huecos que en ese momento están
 * libres y se les asigna la siguiente pareja. Como quitar una ficha nunca
 * bloquea a otra, ese mismo orden es una forma válida de resolver el tablero.
 * Así ninguna partida nace imposible.
 *
 * Si en algún paso quedan menos de dos huecos libres se reintenta el reparto
 * completo. Tras agotar los intentos se cae a un reparto al azar, que sigue
 * siendo jugable aunque ya no traiga la garantía.
 */

import { freeTiles } from './mahjong-engine'
import { getMahjongLayout } from './mahjong-layouts'
import {
  FACES_BY_ID,
  MAHJONG_FACES,
  type MahjongBoardState,
  type MahjongFace,
  type MahjongLayoutId,
  type MahjongTile,
} from './mahjong-types'

const MAX_ATTEMPTS = 60

export type RandomSource = () => number

export function mulberry32(seed: number): RandomSource {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(items: T[], random: RandomSource): T[] {
  const copy = items.slice()

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    const swap = copy[i]
    copy[i] = copy[j]
    copy[j] = swap
  }

  return copy
}

/**
 * Las 72 parejas del set completo. Las 34 fichas normales dan dos parejas
 * cada una; las flores se emparejan entre ellas y las estaciones también,
 * porque de cada dibujo hay una sola copia.
 */
function buildPairPool(random: RandomSource): Array<[MahjongFace, MahjongFace]> {
  const pairs: Array<[MahjongFace, MahjongFace]> = []
  const loose: Record<string, MahjongFace[]> = {}

  for (const item of MAHJONG_FACES) {
    if (item.copies >= 2) {
      for (let i = 0; i < item.copies / 2; i += 1) pairs.push([item, item])
      continue
    }

    const bucket = loose[item.matchKey] ?? []
    bucket.push(item)
    loose[item.matchKey] = bucket
  }

  for (const key of Object.keys(loose)) {
    const bucket = shuffle(loose[key], random)

    for (let i = 0; i + 1 < bucket.length; i += 2) pairs.push([bucket[i], bucket[i + 1]])
  }

  return shuffle(pairs, random)
}

function emptyBoard(layoutId: MahjongLayoutId): MahjongBoardState {
  const layout = getMahjongLayout(layoutId)
  const placeholder = FACES_BY_ID.get('p1') as MahjongFace

  const tiles: MahjongTile[] = layout.slots.map((slot, index) => ({
    index,
    slot,
    face: placeholder,
    removed: false,
  }))

  return {
    layoutId,
    width: layout.width,
    height: layout.height,
    depth: layout.depth,
    tiles,
    history: [],
  }
}

/**
 * Reparte en el orden inverso al de una solución. Devuelve null si el layout
 * se traba durante el intento, para que quien llama reintente.
 */
function attemptDeal(layoutId: MahjongLayoutId, random: RandomSource): MahjongBoardState | null {
  const board = emptyBoard(layoutId)
  const pool = buildPairPool(random)
  const needed = board.tiles.length / 2

  if (pool.length < needed) return null

  // Se marca todo como quitado y se va "devolviendo" en parejas libres.
  for (const tile of board.tiles) tile.removed = false

  const pending = board.tiles.map((tile) => tile.index)
  const assigned = new Set<number>()

  for (let step = 0; step < needed; step += 1) {
    const open = freeTiles(board).filter((tile) => !assigned.has(tile.index))

    if (open.length < 2) return null

    const picked = shuffle(open, random).slice(0, 2)
    const [left, right] = pool[step]

    board.tiles[picked[0].index].face = left
    board.tiles[picked[1].index].face = right

    // Quitarlas del tablero deja libres a las de abajo, igual que al jugar.
    board.tiles[picked[0].index].removed = true
    board.tiles[picked[1].index].removed = true

    assigned.add(picked[0].index)
    assigned.add(picked[1].index)
  }

  if (assigned.size !== pending.length) return null

  for (const tile of board.tiles) tile.removed = false

  board.history = []

  return board
}

function fallbackDeal(layoutId: MahjongLayoutId, random: RandomSource): MahjongBoardState {
  const board = emptyBoard(layoutId)
  const pool = buildPairPool(random)
  const faces: MahjongFace[] = []

  for (let i = 0; i < board.tiles.length / 2; i += 1) faces.push(pool[i][0], pool[i][1])

  const order = shuffle(faces, random)

  board.tiles.forEach((tile, index) => {
    tile.face = order[index]
  })

  return board
}

export interface DealResult {
  board: MahjongBoardState
  /** false solo si se agotaron los intentos y hubo que repartir al azar. */
  guaranteed: boolean
}

export function dealMahjongBoard(layoutId: MahjongLayoutId, seed?: number): DealResult {
  const random = mulberry32(seed ?? Math.floor(Math.random() * 0xffffffff))

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const board = attemptDeal(layoutId, random)

    if (board) return { board, guaranteed: true }
  }

  return { board: fallbackDeal(layoutId, random), guaranteed: false }
}

/**
 * Vuelve a repartir solo las fichas que siguen en el tablero, conservando el
 * historial. Se usa cuando el jugador se traba y pide barajar.
 */
export function reshuffleRemaining(board: MahjongBoardState, seed?: number): boolean {
  const random = mulberry32(seed ?? Math.floor(Math.random() * 0xffffffff))
  const alive = board.tiles.filter((tile) => !tile.removed)

  if (alive.length < 2) return false

  const counts = new Map<string, number>()

  for (const tile of alive) counts.set(tile.face.id, (counts.get(tile.face.id) ?? 0) + 1)

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const available = new Map(counts)
    const snapshot = alive.map((tile) => tile.removed)
    const assigned = new Set<number>()
    let ok = true

    for (const tile of alive) tile.removed = false

    for (let step = 0; step < alive.length / 2; step += 1) {
      const open = freeTiles(board).filter((tile) => !assigned.has(tile.index))

      if (open.length < 2) {
        ok = false
        break
      }

      const pair = takeMatchingPair(available, random)

      if (!pair) {
        ok = false
        break
      }

      const picked = shuffle(open, random).slice(0, 2)

      board.tiles[picked[0].index].face = pair[0]
      board.tiles[picked[1].index].face = pair[1]
      board.tiles[picked[0].index].removed = true
      board.tiles[picked[1].index].removed = true

      assigned.add(picked[0].index)
      assigned.add(picked[1].index)
    }

    for (const tile of alive) tile.removed = false

    if (ok) return true

    alive.forEach((tile, index) => {
      tile.removed = snapshot[index]
    })
  }

  return false
}

/** Saca del inventario dos fichas que emparejen entre sí. */
function takeMatchingPair(
  available: Map<string, number>,
  random: RandomSource
): [MahjongFace, MahjongFace] | null {
  const ids = shuffle(
    [...available.entries()].filter(([, count]) => count > 0).map(([id]) => id),
    random
  )

  for (const id of ids) {
    const face = FACES_BY_ID.get(id) as MahjongFace

    if ((available.get(id) ?? 0) >= 2) {
      available.set(id, (available.get(id) ?? 0) - 2)
      return [face, face]
    }

    const partnerId = ids.find(
      (other) => other !== id && (FACES_BY_ID.get(other) as MahjongFace).matchKey === face.matchKey
    )

    if (partnerId) {
      const partner = FACES_BY_ID.get(partnerId) as MahjongFace
      available.set(id, (available.get(id) ?? 0) - 1)
      available.set(partnerId, (available.get(partnerId) ?? 0) - 1)
      return [face, partner]
    }
  }

  return null
}
