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

import { freeTiles, listAvailablePairs } from './mahjong-engine'
import { getMahjongLayout } from './mahjong-layouts'
import {
  FACES_BY_ID,
  MAHJONG_FACES,
  type MahjongBoardState,
  type MahjongDifficulty,
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
  // Las parejas van agrupadas en juegos de cuatro fichas: las 34 caras con sus
  // cuatro copias, más las cuatro flores y las cuatro estaciones (que emparejan
  // entre ellas). Se barajan los juegos completos, no las parejas sueltas, para
  // que un tablero chico como Torre reparta 18 dibujos con sus cuatro copias en
  // vez de 36 dibujos a medias: así se conserva la decisión de cuál de las
  // cuatro iguales conviene quitar.
  const units: Array<Array<[MahjongFace, MahjongFace]>> = []
  const loose: Record<string, MahjongFace[]> = {}

  for (const item of MAHJONG_FACES) {
    if (item.copies >= 2) {
      const pairs: Array<[MahjongFace, MahjongFace]> = []

      for (let i = 0; i < item.copies / 2; i += 1) pairs.push([item, item])

      units.push(pairs)
      continue
    }

    const bucket = loose[item.matchKey] ?? []
    bucket.push(item)
    loose[item.matchKey] = bucket
  }

  for (const key of Object.keys(loose)) {
    const bucket = shuffle(loose[key], random)
    const pairs: Array<[MahjongFace, MahjongFace]> = []

    for (let i = 0; i + 1 < bucket.length; i += 2) pairs.push([bucket[i], bucket[i + 1]])

    if (pairs.length > 0) units.push(pairs)
  }

  return shuffle(units, random).flat()
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
 * Dos huecos libres lo más separados posible (de unos cuantos al azar), para
 * que las fichas de una pareja no queden una junto a la otra ni las dos
 * visibles desde el inicio.
 */
function pickApart(
  open: MahjongTile[],
  random: RandomSource,
  startFree: Set<number>
): [MahjongTile, MahjongTile] {
  const first = open[Math.floor(random() * open.length)]
  let best = first === open[0] ? open[1] : open[0]
  let bestDistance = -1

  for (let i = 0; i < 6; i += 1) {
    const other = open[Math.floor(random() * open.length)]
    if (other === first) continue
    const distance =
      Math.abs(other.slot.x - first.slot.x) +
      Math.abs(other.slot.y - first.slot.y) +
      4 * Math.abs(other.slot.z - first.slot.z) -
      // Que no queden las dos a la vista desde el inicio.
      (startFree.has(first.index) && startFree.has(other.index) ? 100 : 0)
    if (distance > bestDistance) {
      best = other
      bestDistance = distance
    }
  }

  return [first, best]
}

/**
 * Coloca `pairsIn` sobre las fichas no quitadas del tablero, en el orden
 * inverso al de una solución: en cada paso dos huecos libres reciben una
 * pareja y se "quitan", lo que libera a los de abajo. Al terminar las deja
 * otra vez en el tablero. Devuelve false si el layout se trabó (los dibujos
 * quedan a medias: quien llama reintenta o los restaura).
 */
function placePairs(
  board: MahjongBoardState,
  pairsIn: Array<[MahjongFace, MahjongFace]>,
  random: RandomSource,
  difficulty: MahjongDifficulty
): boolean {
  const targets = board.tiles.filter((tile) => !tile.removed)
  // El pool trae las parejas de un mismo dibujo seguidas; si se reparten así,
  // las cuatro copias terminan juntas y a la vista. Se mezcla el orden.
  const pairs = shuffle(pairsIn, random)
  // Las fichas libres al empezar ya se conocen. Si dos de ellas comparten
  // dibujo la pareja queda servida, así que a esos huecos se les da el dibujo
  // que menos se repite ahí. En Fácil no se esconde nada.
  const startFree = new Set(
    difficulty === 'facil' ? [] : freeTiles(board).map((tile) => tile.index)
  )
  const shownAtStart = new Map<string, number>()
  let ok = true

  for (let step = 0; step < targets.length / 2; step += 1) {
    const open = freeTiles(board)

    if (open.length < 2) {
      ok = false
      break
    }

    const picked: MahjongTile[] =
      difficulty === 'facil'
        ? shuffle(open, random).slice(0, 2)
        : pickApart(open, random, startFree)
    const visible = picked.filter((tile) => startFree.has(tile.index)).length
    let choice = 0

    if (visible > 0) {
      let fewest = Infinity
      for (let i = 0; i < pairs.length; i += 1) {
        const shown = shownAtStart.get(pairs[i][0].matchKey) ?? 0
        if (shown < fewest) {
          fewest = shown
          choice = i
        }
      }
      const key = pairs[choice][0].matchKey
      shownAtStart.set(key, (shownAtStart.get(key) ?? 0) + visible)
    }

    const [left, right] = pairs.splice(choice, 1)[0]

    picked[0].face = left
    picked[1].face = right
    // Quitarlas del tablero deja libres a las de abajo, igual que al jugar.
    picked[0].removed = true
    picked[1].removed = true
  }

  for (const tile of targets) tile.removed = false

  return ok
}

function attemptDeal(
  layoutId: MahjongLayoutId,
  random: RandomSource,
  difficulty: MahjongDifficulty
): MahjongBoardState | null {
  const board = emptyBoard(layoutId)
  const pool = buildPairPool(random)
  const needed = board.tiles.length / 2

  if (pool.length < needed) return null

  return placePairs(board, pool.slice(0, needed), random, difficulty) ? board : null
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

/** Repartos que Difícil compara, y partidas al azar con que mide cada uno. */
const HARD_CANDIDATES = 5
const HARD_PLAYOUTS = 6

/**
 * Qué tan seguido se traba alguien que quita parejas al azar: mide las
 * trampas (elegir mal entre varias iguales), no las parejas a la vista.
 */
export function deadEndRate(
  board: MahjongBoardState,
  random: RandomSource,
  playouts: number
): number {
  let stuck = 0

  for (let run = 0; run < playouts; run += 1) {
    for (;;) {
      const pairs = listAvailablePairs(board)
      if (pairs.length === 0) break
      const [a, b] = pairs[Math.floor(random() * pairs.length)]
      a.removed = true
      b.removed = true
    }

    if (board.tiles.some((tile) => !tile.removed)) stuck += 1

    for (const tile of board.tiles) tile.removed = false
  }

  return stuck / playouts
}

export interface DealResult {
  board: MahjongBoardState
  /** false solo si se agotaron los intentos y hubo que repartir al azar. */
  guaranteed: boolean
}

function dealOnce(
  layoutId: MahjongLayoutId,
  random: RandomSource,
  difficulty: MahjongDifficulty
): MahjongBoardState | null {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const board = attemptDeal(layoutId, random, difficulty)

    if (board) return board
  }

  return null
}

/** Mismo layout, semilla y dificultad dan siempre el mismo reparto. */
export function dealMahjongBoard(
  layoutId: MahjongLayoutId,
  seed?: number,
  difficulty: MahjongDifficulty = 'normal'
): DealResult {
  const random = mulberry32(seed ?? Math.floor(Math.random() * 0xffffffff))
  const candidates = difficulty === 'dificil' ? HARD_CANDIDATES : 1
  let best: MahjongBoardState | null = null
  let bestRate = -1

  for (let i = 0; i < candidates; i += 1) {
    const board = dealOnce(layoutId, random, difficulty)

    if (!board) continue
    if (candidates === 1) return { board, guaranteed: true }

    const rate = deadEndRate(board, random, HARD_PLAYOUTS)

    if (rate > bestRate) {
      best = board
      bestRate = rate
    }
  }

  if (best) return { board: best, guaranteed: true }

  return { board: fallbackDeal(layoutId, random), guaranteed: false }
}

/** Las fichas que siguen en el tablero, agrupadas en parejas que emparejan. */
function pairsOfAlive(board: MahjongBoardState): Array<[MahjongFace, MahjongFace]> | null {
  const byKey = new Map<string, MahjongFace[]>()

  for (const tile of board.tiles) {
    if (tile.removed) continue
    const bucket = byKey.get(tile.face.matchKey) ?? []
    bucket.push(tile.face)
    byKey.set(tile.face.matchKey, bucket)
  }

  const pairs: Array<[MahjongFace, MahjongFace]> = []

  for (const bucket of byKey.values()) {
    if (bucket.length % 2 !== 0) return null
    for (let i = 0; i < bucket.length; i += 2) pairs.push([bucket[i], bucket[i + 1]])
  }

  return pairs
}

/**
 * Vuelve a repartir solo las fichas que siguen en el tablero, conservando el
 * historial, con la misma colocación que usa la dificultad al repartir, de
 * modo que el resto tenga solución. Se usa cuando el jugador se traba y pide
 * barajar. Devuelve false (y deja el tablero igual) si ningún acomodo tiene
 * solución, p. ej. cuando quedan dos fichas una sobre otra.
 */
export function reshuffleRemaining(
  board: MahjongBoardState,
  seed?: number,
  difficulty: MahjongDifficulty = 'normal'
): boolean {
  const random = mulberry32(seed ?? Math.floor(Math.random() * 0xffffffff))
  const alive = board.tiles.filter((tile) => !tile.removed)
  const pairs = pairsOfAlive(board)

  if (alive.length < 2 || !pairs) return false

  const faces = alive.map((tile) => tile.face)

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    if (placePairs(board, pairs, random, difficulty)) return true

    // Un intento fallido ya cambió dibujos: se devuelven para no dejar fichas sin pareja.
    alive.forEach((tile, index) => {
      tile.face = faces[index]
    })
  }

  return false
}
