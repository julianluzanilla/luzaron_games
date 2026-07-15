import type { AppState, GameId } from '../../app/types'
import type { DownloadedPack } from '../../core/db-types'
import { getPackStatusClass, getPackStatusLabel } from '../../core/pack-labels'

const gameLabels: Record<GameId, string> = {
  queens: 'Queens',
  sudoku: 'Sudoku',
  wordle: 'Wordle',
}

const gameDescriptions: Record<GameId, string> = {
  queens: '7x7, 8x8, 9x9, 10x10, 11x11 y 12x12.',
  sudoku: 'Mini 6x6 y regular 9x9.',
  wordle: 'Español e inglés, inicialmente de 5 letras.',
}

const gameOrder: GameId[] = ['queens', 'sudoku', 'wordle']

export function renderLibraryScreen(state: AppState): string {
  const content = gameOrder.map((gameId) => renderGamePackSection(gameId, state.packs)).join('')

  return `
    <section class="screen content-screen">
      <div class="section-header">
        <p class="eyebrow">Niveles</p>
        <h1>Biblioteca</h1>
        <p>
          Administra los packs disponibles para jugar offline.
        </p>
      </div>

      <div class="library-sections">
        ${content}
      </div>
    </section>
  `
}

function renderGamePackSection(gameId: GameId, packs: DownloadedPack[]): string {
  const gamePacks = packs.filter((pack) => pack.gameId === gameId)
  const packCards =
    gamePacks.length > 0
      ? gamePacks.map(renderPackCard).join('')
      : `<p class="empty-state">No hay packs disponibles todavía.</p>`

  return `
    <section class="library-section">
      <div class="library-section-header">
        <div>
          <h2>${gameLabels[gameId]}</h2>
          <p>${gameDescriptions[gameId]}</p>
        </div>
      </div>

      <div class="pack-grid">
        ${packCards}
      </div>
    </section>
  `
}

function renderPackCard(pack: DownloadedPack): string {
  return `
    <article class="pack-card">
      <div>
        <h3>${pack.title}</h3>
        <p>${pack.levelCount} niveles · versión ${pack.version}</p>
      </div>

      <div class="pack-card-footer">
        <span class="pack-status ${getPackStatusClass(pack.status)}">
          ${getPackStatusLabel(pack.status)}
        </span>

        <button type="button" class="secondary-button" disabled>
          Próximamente
        </button>
      </div>
    </article>
  `
}
