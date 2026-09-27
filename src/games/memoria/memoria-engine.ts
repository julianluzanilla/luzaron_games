/**
 * Memoria: baraja, estado de la partida y categorías de récord.
 *
 * Lógica pura, sin DOM ni tiempos: la pantalla (memoria-app.ts) decide cuándo
 * resolver un par para poder animar el volteo antes.
 */

import { MEMORIA_PLAYERS } from './memoria-players'

export type MemoriaSizeId = '4x5' | '5x6' | '6x6'

export interface MemoriaSize {
  id: MemoriaSizeId
  label: string
  cols: number
  rows: number
}

export const MEMORIA_SIZES: MemoriaSize[] = [
  { id: '4x5', label: '4×5', cols: 4, rows: 5 },
  { id: '5x6', label: '5×6', cols: 5, rows: 6 },
  { id: '6x6', label: '6×6', cols: 6, rows: 6 },
]

export function getMemoriaSize(id: MemoriaSizeId): MemoriaSize {
  return MEMORIA_SIZES.find((size) => size.id === id) ?? MEMORIA_SIZES[0]
}

export function isMemoriaSizeId(value: unknown): value is MemoriaSizeId {
  return MEMORIA_SIZES.some((size) => size.id === value)
}

/** Categoría de récord: el mejor tiempo es por tamaño. */
export function memoriaPackId(size: MemoriaSizeId): string {
  return `memoria-${size}`
}

export interface MemoriaCard {
  /** id del jugador (memoria-players.ts). */
  player: string
  matched: boolean
}

export interface MemoriaGame {
  size: MemoriaSize
  cards: MemoriaCard[]
  /** Cartas volteadas que todavía no se resuelven (0, 1 o 2). */
  open: number[]
  pairsFound: number
  pairsTotal: number
  /** Intentos: cada segunda carta volteada cuenta uno. */
  moves: number
}

/**
 * Elige al azar `pares` jugadores de los 32, pone cada uno dos veces y revuelve
 * la baraja con Fisher-Yates. Así no siempre salen los mismos.
 */
export function createMemoriaGame(sizeId: MemoriaSizeId, random = Math.random): MemoriaGame {
  const size = getMemoriaSize(sizeId)
  const pairs = (size.cols * size.rows) / 2
  const players = shuffle(
    MEMORIA_PLAYERS.map((player) => player.id),
    random
  ).slice(0, pairs)
  const deck = shuffle([...players, ...players], random)

  return {
    size,
    cards: deck.map((player) => ({ player, matched: false })),
    open: [],
    pairsFound: 0,
    pairsTotal: pairs,
    moves: 0,
  }
}

function shuffle<T>(items: T[], random: () => number): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}

export function canFlip(game: MemoriaGame, index: number): boolean {
  const card = game.cards[index]
  return !!card && !card.matched && game.open.length < 2 && !game.open.includes(index)
}

export type FlipResult = 'ignored' | 'first' | 'second'

/** Voltea una carta. Con la segunda, el par queda pendiente de `resolveOpen`. */
export function flipCard(game: MemoriaGame, index: number): FlipResult {
  if (!canFlip(game, index)) return 'ignored'

  game.open.push(index)
  if (game.open.length === 1) return 'first'

  game.moves += 1
  return 'second'
}

export function openIsMatch(game: MemoriaGame): boolean {
  if (game.open.length !== 2) return false
  const [a, b] = game.open
  return game.cards[a].player === game.cards[b].player
}

/**
 * Resuelve el par volteado: si coincide se queda boca arriba; si no, las dos
 * vuelven boca abajo. Devuelve las dos cartas y si fue par.
 */
export function resolveOpen(game: MemoriaGame): { cards: number[]; match: boolean } | null {
  if (game.open.length !== 2) return null

  const cards = game.open
  const match = openIsMatch(game)

  if (match) {
    for (const index of cards) game.cards[index].matched = true
    game.pairsFound += 1
  }

  game.open = []
  return { cards, match }
}

export function isMemoriaComplete(game: MemoriaGame): boolean {
  return game.pairsFound === game.pairsTotal
}
