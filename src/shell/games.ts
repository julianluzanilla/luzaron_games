/**
 * Catálogo de juegos de la plataforma.
 *
 * Es la única fuente de verdad: la home dibuja sus tarjetas desde aquí, el
 * router valida las rutas contra `available` y el header toma el nombre.
 * Las miniaturas son SVG en línea (no archivos) para que no haya una petición
 * extra por juego; viven en games-thumbnails.ts (rediseño Modernist).
 */

import {
  MAHJONG_THUMB,
  MEMORIA_THUMB,
  QUEENS_THUMB,
  SUDOKU_THUMB,
  WORDLE_THUMB,
  ZIP_THUMB,
} from './games-thumbnails'

export type GameId = 'queens' | 'sudoku' | 'wordle' | 'mahjong' | 'zip' | 'memoria'

export interface GameEntry {
  id: GameId
  /** Nombre corto, el que va en el header y bajo la miniatura. */
  label: string
  /** Una línea de qué se juega, para la tarjeta de la home. */
  tagline: string
  available: boolean
  /** Color propio del juego (los cinco cuadros del logo; Memoria usa magenta). */
  color: string
  /** Miniatura cuadrada, viewBox 0 0 100 100. */
  thumbnail: string
}

export const GAMES: GameEntry[] = [
  {
    id: 'queens',
    label: 'Queens',
    tagline: 'Una reina por fila, columna y color',
    available: true,
    color: '#9a55e0',
    thumbnail: QUEENS_THUMB,
  },
  {
    id: 'sudoku',
    label: 'Sudoku',
    tagline: 'Mini 6×6 y clásico 9×9',
    available: true,
    color: '#2f78e4',
    thumbnail: SUDOKU_THUMB,
  },
  {
    id: 'wordle',
    label: 'Wordle',
    tagline: 'Palabra del día en español e inglés',
    available: true,
    color: '#1f9e52',
    thumbnail: WORDLE_THUMB,
  },
  {
    id: 'mahjong',
    label: 'Mahjong',
    tagline: 'Solitario de parejas, 3 tableros',
    available: true,
    color: '#f29d12',
    thumbnail: MAHJONG_THUMB,
  },
  {
    id: 'zip',
    label: 'Zip',
    tagline: 'Un solo trazo que llena el tablero',
    available: true,
    color: '#ec3013',
    thumbnail: ZIP_THUMB,
  },
  {
    id: 'memoria',
    label: 'Memoria',
    tagline: 'Voltea dos y encuentra los pares',
    available: true,
    color: '#e24aa0',
    thumbnail: MEMORIA_THUMB,
  },
]

export function getGameEntry(id: GameId): GameEntry {
  return GAMES.find((game) => game.id === id) ?? GAMES[0]
}

export function isGameId(value: string | null | undefined): value is GameId {
  return !!value && GAMES.some((game) => game.id === value)
}

export function isPlayableGameId(value: string | null | undefined): value is GameId {
  return !!value && GAMES.some((game) => game.id === value && game.available)
}
