/**
 * Catálogo de juegos de la plataforma.
 *
 * Es la única fuente de verdad: la home dibuja sus tarjetas desde aquí, el
 * router valida las rutas contra `available` y el header toma el nombre.
 * Las miniaturas son SVG en línea (no archivos) para que no haya una petición
 * extra por juego y para que hereden los colores del tema.
 */

export type GameId = 'queens' | 'sudoku' | 'wordle' | 'mahjong'

export interface GameEntry {
  id: GameId
  /** Nombre corto, el que va en el header y bajo la miniatura. */
  label: string
  /** Una línea de qué se juega, para la tarjeta de la home. */
  tagline: string
  available: boolean
  /** Marca del juego (emoji o carácter) para espacios muy chicos. */
  mark: string
  /** Miniatura cuadrada, viewBox 0 0 100 100. */
  thumbnail: string
}

/* ---------------------------------------------------------------------- */
/* Miniaturas                                                              */
/* ---------------------------------------------------------------------- */

/** Queens: regiones de color y dos coronas, como el tablero real. */
const QUEENS_THUMB = `
<svg viewBox="0 0 100 100" role="img" aria-hidden="true" class="game-thumb-art">
  <g shape-rendering="crispEdges">
    <rect x="0" y="0" width="50" height="25" fill="#f2c230"/>
    <rect x="50" y="0" width="50" height="25" fill="#7c5cfc"/>
    <rect x="0" y="25" width="25" height="50" fill="#e23d6b"/>
    <rect x="25" y="25" width="50" height="25" fill="#2f8fe0"/>
    <rect x="75" y="25" width="25" height="50" fill="#7c5cfc"/>
    <rect x="25" y="50" width="50" height="25" fill="#2fbf71"/>
    <rect x="0" y="75" width="50" height="25" fill="#ff7a1a"/>
    <rect x="50" y="75" width="50" height="25" fill="#2fbf71"/>
  </g>
  <g stroke="#0d1017" stroke-width="2.5" opacity="0.75">
    <path d="M0 25h100M0 50h100M0 75h100M25 0v100M50 0v100M75 0v100"/>
  </g>
  <!-- Corona: valles profundos y perlas en las puntas. Con valles cortos la
       silueta se lee como una montana en vez de como una reina. -->
  <g fill="#12151c">
    <g transform="translate(55 6)">
      <path d="M0 15.5L1.6 2.5 7.5 9.5 10 0.8 12.5 9.5 18.4 2.5 20 15.5Z"/>
      <rect x="0.6" y="17" width="18.8" height="3.4" rx="1.2"/>
      <circle cx="1.6" cy="2.5" r="1.8"/>
      <circle cx="10" cy="0.8" r="2"/>
      <circle cx="18.4" cy="2.5" r="1.8"/>
    </g>
    <g transform="translate(5 56)">
      <path d="M0 15.5L1.6 2.5 7.5 9.5 10 0.8 12.5 9.5 18.4 2.5 20 15.5Z"/>
      <rect x="0.6" y="17" width="18.8" height="3.4" rx="1.2"/>
      <circle cx="1.6" cy="2.5" r="1.8"/>
      <circle cx="10" cy="0.8" r="2"/>
      <circle cx="18.4" cy="2.5" r="1.8"/>
    </g>
  </g>
</svg>`

/** Sudoku: rejilla 9x9 con las líneas de caja marcadas y algunos dígitos. */
const SUDOKU_THUMB = `
<svg viewBox="0 0 100 100" role="img" aria-hidden="true" class="game-thumb-art">
  <rect x="0" y="0" width="100" height="100" fill="var(--thumb-paper)"/>
  <g stroke="var(--thumb-rule)" stroke-width="1.1">
    <path d="M11.1 0v100M22.2 0v100M44.4 0v100M55.6 0v100M77.8 0v100M88.9 0v100"/>
    <path d="M0 11.1h100M0 22.2h100M0 44.4h100M0 55.6h100M0 77.8h100M0 88.9h100"/>
  </g>
  <g stroke="var(--thumb-rule-strong)" stroke-width="2.6">
    <path d="M33.3 0v100M66.7 0v100M0 33.3h100M0 66.7h100"/>
  </g>
  <g font-family="Manrope, system-ui, sans-serif" font-size="9" font-weight="700"
     text-anchor="middle" fill="var(--thumb-ink)">
    <text x="5.6" y="9">5</text><text x="27.8" y="9">3</text><text x="61.1" y="9">7</text>
    <text x="16.7" y="31">9</text><text x="50" y="31">1</text><text x="94.4" y="31">4</text>
    <text x="38.9" y="53">8</text><text x="83.3" y="53">6</text>
    <text x="5.6" y="75">2</text><text x="72.2" y="75">9</text>
    <text x="27.8" y="97">4</text><text x="61.1" y="97">1</text><text x="94.4" y="97">7</text>
  </g>
  <g font-family="Manrope, system-ui, sans-serif" font-size="9" font-weight="600"
     text-anchor="middle" fill="#2f8fe0">
    <text x="50" y="53">3</text><text x="16.7" y="75">6</text><text x="83.3" y="9">2</text>
  </g>
</svg>`

/** Wordle: tres renglones, el último a medio escribir. */
const WORDLE_THUMB = `
<svg viewBox="0 0 100 100" role="img" aria-hidden="true" class="game-thumb-art">
  <rect x="0" y="0" width="100" height="100" fill="var(--thumb-paper)"/>
  <g font-family="Manrope, system-ui, sans-serif" font-size="12" font-weight="800"
     text-anchor="middle" fill="#ffffff">
    <rect x="6" y="10" width="17" height="17" rx="2" fill="#8a8f98"/><text x="14.5" y="23">L</text>
    <rect x="26" y="10" width="17" height="17" rx="2" fill="#f2c230"/><text x="34.5" y="23">U</text>
    <rect x="46" y="10" width="17" height="17" rx="2" fill="#8a8f98"/><text x="54.5" y="23">N</text>
    <rect x="66" y="10" width="17" height="17" rx="2" fill="#8a8f98"/><text x="74.5" y="23">E</text>
    <rect x="6" y="31" width="17" height="17" rx="2" fill="#2fbf71"/><text x="14.5" y="44">J</text>
    <rect x="26" y="31" width="17" height="17" rx="2" fill="#2fbf71"/><text x="34.5" y="44">U</text>
    <rect x="46" y="31" width="17" height="17" rx="2" fill="#8a8f98"/><text x="54.5" y="44">G</text>
    <rect x="66" y="31" width="17" height="17" rx="2" fill="#f2c230"/><text x="74.5" y="44">A</text>
  </g>
  <g font-family="Manrope, system-ui, sans-serif" font-size="12" font-weight="800"
     text-anchor="middle" fill="var(--thumb-ink)">
    <rect x="6" y="52" width="17" height="17" rx="2" fill="none"
          stroke="var(--thumb-rule-strong)" stroke-width="2"/><text x="14.5" y="65">J</text>
    <rect x="26" y="52" width="17" height="17" rx="2" fill="none"
          stroke="var(--thumb-rule-strong)" stroke-width="2"/><text x="34.5" y="65">U</text>
    <rect x="46" y="52" width="17" height="17" rx="2" fill="none"
          stroke="var(--thumb-rule)" stroke-width="2"/>
    <rect x="66" y="52" width="17" height="17" rx="2" fill="none"
          stroke="var(--thumb-rule)" stroke-width="2"/>
  </g>
  <g fill="var(--thumb-rule)">
    <rect x="6" y="78" width="12" height="12" rx="2"/><rect x="21" y="78" width="12" height="12" rx="2"/>
    <rect x="36" y="78" width="12" height="12" rx="2"/><rect x="51" y="78" width="12" height="12" rx="2"/>
    <rect x="66" y="78" width="12" height="12" rx="2"/><rect x="81" y="78" width="12" height="12" rx="2"/>
  </g>
</svg>`

/** Mahjong: tres fichas apiladas con el extruido de la ficha real. */
const MAHJONG_THUMB = `
<svg viewBox="0 0 100 100" role="img" aria-hidden="true" class="game-thumb-art">
  <rect x="0" y="0" width="100" height="100" fill="#1d6b4a"/>
  <g stroke="#8a6a3a" stroke-width="1.4" stroke-linejoin="round">
    <path d="M14 34h26v40H14z" fill="#c9a978"/>
    <path d="M8 28h26v40H8z" fill="#f6efdd"/>
  </g>
  <g stroke="#8a6a3a" stroke-width="1.4" stroke-linejoin="round">
    <path d="M52 20h26v40H52z" fill="#c9a978"/>
    <path d="M46 14h26v40H46z" fill="#f6efdd"/>
  </g>
  <g stroke="#8a6a3a" stroke-width="1.4" stroke-linejoin="round">
    <path d="M66 60h26v34H66z" fill="#c9a978"/>
    <path d="M60 54h26v34H60z" fill="#f6efdd"/>
  </g>
  <g fill="none" stroke="#2f6fd0" stroke-width="2.6">
    <circle cx="21" cy="41" r="4.5"/><circle cx="21" cy="55" r="4.5"/>
  </g>
  <g fill="#c22239" font-family="Noto Serif, Georgia, serif" font-size="22"
     font-weight="700" text-anchor="middle">
    <text x="59" y="42">中</text>
  </g>
  <g fill="#1d8a52" font-family="Noto Serif, Georgia, serif" font-size="20"
     font-weight="700" text-anchor="middle">
    <text x="73" y="78">發</text>
  </g>
</svg>`

/* ---------------------------------------------------------------------- */
/* Catálogo                                                                */
/* ---------------------------------------------------------------------- */

export const GAMES: GameEntry[] = [
  {
    id: 'queens',
    label: 'Queens',
    tagline: 'Una reina por fila, columna y color',
    available: true,
    mark: '♛',
    thumbnail: QUEENS_THUMB,
  },
  {
    id: 'sudoku',
    label: 'Sudoku',
    tagline: 'Mini 6×6 y clásico 9×9',
    available: true,
    mark: '#',
    thumbnail: SUDOKU_THUMB,
  },
  {
    id: 'wordle',
    label: 'Wordle',
    tagline: 'Palabra del día en español e inglés',
    available: true,
    mark: 'W',
    thumbnail: WORDLE_THUMB,
  },
  {
    id: 'mahjong',
    label: 'Mahjong',
    tagline: 'Solitario de parejas, 3 tableros',
    available: true,
    mark: '🀄',
    thumbnail: MAHJONG_THUMB,
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
