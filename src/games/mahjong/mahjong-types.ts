/**
 * Tipos y catálogo de fichas del Mahjong Solitario.
 *
 * El set son 144 fichas repartidas en 42 dibujos distintos. Todo lo que
 * emparejan lo decide `matchKey`, nunca `id`: las cuatro flores hacen par
 * entre sí y las cuatro estaciones entre sí aunque el dibujo sea distinto,
 * porque de cada una hay una sola copia. Eso deja 36 clases.
 */

export type MahjongSuit = 'dots' | 'bamboo' | 'chars' | 'wind' | 'dragon' | 'flower' | 'season'

export interface MahjongFace {
  /** Id del <symbol> en public/art/mahjong/mahjong-tiles.svg (sin el prefijo mj-). */
  id: string
  name: string
  suit: MahjongSuit
  /** Dos fichas emparejan si comparten matchKey. */
  matchKey: string
  /** Copias de este dibujo dentro del set completo. */
  copies: number
}

function face(id: string, name: string, suit: MahjongSuit, matchKey = id, copies = 4): MahjongFace {
  return { id, name, suit, matchKey, copies }
}

const NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

export const MAHJONG_FACES: MahjongFace[] = [
  ...NUMBERS.map((n) => face(`p${n}`, `Círculos ${n}`, 'dots')),
  ...NUMBERS.map((n) => face(`s${n}`, `Bambú ${n}`, 'bamboo')),
  ...NUMBERS.map((n) => face(`m${n}`, `Caracteres ${n}`, 'chars')),
  face('we', 'Viento este', 'wind'),
  face('ws', 'Viento sur', 'wind'),
  face('ww', 'Viento oeste', 'wind'),
  face('wn', 'Viento norte', 'wind'),
  face('dr', 'Dragón rojo', 'dragon'),
  face('dg', 'Dragón verde', 'dragon'),
  face('dw', 'Dragón blanco', 'dragon'),
  face('f1', 'Flor: ciruelo', 'flower', 'flower', 1),
  face('f2', 'Flor: orquídea', 'flower', 'flower', 1),
  face('f3', 'Flor: crisantemo', 'flower', 'flower', 1),
  face('f4', 'Flor: bambú', 'flower', 'flower', 1),
  face('e1', 'Estación: primavera', 'season', 'season', 1),
  face('e2', 'Estación: verano', 'season', 'season', 1),
  face('e3', 'Estación: otoño', 'season', 'season', 1),
  face('e4', 'Estación: invierno', 'season', 'season', 1),
]

export const FACES_BY_ID = new Map(MAHJONG_FACES.map((item) => [item.id, item]))

/** 144 con el set completo. */
export const FULL_SET_SIZE = MAHJONG_FACES.reduce((total, item) => total + item.copies, 0)

/**
 * Posición de una ficha en la rejilla, en medias fichas: una ficha ocupa dos
 * unidades de ancho y dos de alto, así que los medios pasos permiten las
 * filas montadas del layout clásico. `z` es el nivel, 0 abajo.
 */
export interface MahjongSlot {
  x: number
  y: number
  z: number
}

export type MahjongLayoutId = 'jardin' | 'piramide' | 'tortuga'

export interface MahjongLayout {
  id: MahjongLayoutId
  label: string
  /** Ancho y alto del tablero en medias fichas, y niveles usados. */
  width: number
  height: number
  depth: number
  slots: MahjongSlot[]
}

export const LAYOUT_LABELS: Record<MahjongLayoutId, string> = {
  jardin: 'Jardín',
  piramide: 'Pirámide',
  tortuga: 'Tortuga',
}

export const LAYOUT_HINTS: Record<MahjongLayoutId, string> = {
  jardin: '72 fichas, dos niveles. Para empezar.',
  piramide: '120 fichas, cuatro niveles.',
  tortuga: '144 fichas, el tablero clásico.',
}

export const MAHJONG_LAYOUT_IDS: MahjongLayoutId[] = ['jardin', 'piramide', 'tortuga']

/** Una ficha ya colocada en el tablero. */
export interface MahjongTile {
  index: number
  slot: MahjongSlot
  face: MahjongFace
  removed: boolean
}

export interface MahjongBoardState {
  layoutId: MahjongLayoutId
  width: number
  height: number
  depth: number
  tiles: MahjongTile[]
  /** Parejas quitadas, en orden, para deshacer. */
  history: Array<[number, number]>
}

export function remainingTiles(board: MahjongBoardState): number {
  return board.tiles.reduce((total, tile) => total + (tile.removed ? 0 : 1), 0)
}
