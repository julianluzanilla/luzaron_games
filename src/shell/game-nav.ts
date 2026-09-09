export type GameId = 'queens' | 'sudoku' | 'wordle' | 'mahjong'

export interface GameEntry {
  id: GameId
  label: string
  available: boolean
  /** Emoji que se usa como marca del juego activo. */
  mark: string
}

export const GAMES: GameEntry[] = [
  { id: 'queens', label: 'Queens', available: true, mark: '♛' },
  { id: 'sudoku', label: 'Sudoku', available: false, mark: '#' },
  { id: 'wordle', label: 'Wordle', available: true, mark: 'W' },
  { id: 'mahjong', label: 'Mahjong Solitaire', available: false, mark: '🀄' },
]

export function getGameEntry(id: GameId): GameEntry {
  return GAMES.find((game) => game.id === id) ?? GAMES[0]
}

/** Barra superior compartida por todos los juegos. */
export function renderTopNav(active: GameId): string {
  const tabs = GAMES.map(
    (game) => `
      <button
        type="button"
        class="game-tab ${game.id === active ? 'active' : ''}"
        data-action="select-game"
        data-game="${game.id}"
        ${game.available ? '' : 'disabled'}
      >
        <span>${game.label}</span>
        ${game.available ? '' : '<span class="game-tab-badge">Pronto</span>'}
      </button>
    `
  ).join('')

  return `
    <header class="app-header">
      <span class="brand-mark" aria-hidden="true">${getGameEntry(active).mark}</span>
      <nav class="game-nav" aria-label="Selector de juego">${tabs}</nav>
    </header>
  `
}
