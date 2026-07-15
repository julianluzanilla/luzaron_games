import type { AppState, GameId } from '../../app/types'
import type { DownloadedPack } from '../../core/db-types'
import {
  getPackDifficultyLabel,
  getPackStatusClass,
  getPackStatusLabel,
} from '../../core/pack-labels'

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
  const gamePacks = packs
    .filter((pack) => pack.gameId === gameId)
    .sort((a, b) => a.sortOrder - b.sortOrder)

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
        <div class="pack-card-header">
          <h3>${pack.title}</h3>
          <span class="pack-category">${pack.category}</span>
        </div>

        <p>
          ${pack.levelCount} niveles · versión ${pack.version} · ${getPackDifficultyLabel(pack.difficulty)}
        </p>
      </div>

      <div class="pack-card-footer">
        <span class="pack-status ${getPackStatusClass(pack.status)}">
          ${getPackStatusLabel(pack.status)}
        </span>

        ${renderPackButton(pack)}
      </div>
    </article>
  `
}

function renderPackButton(pack: DownloadedPack): string {
  if (pack.status === 'downloaded') {
    return `
      <button type="button" class="secondary-button" disabled>
        Descargado
      </button>
    `
  }

  if (pack.status === 'downloading') {
    return `
      <button type="button" class="secondary-button" disabled>
        Descargando...
      </button>
    `
  }

  if (pack.status === 'update-available') {
    return `
      <button
        type="button"
        class="secondary-button"
        data-action="download-pack"
        data-pack-id="${pack.id}"
      >
        Actualizar
      </button>
    `
  }

  if (pack.status === 'error') {
    return `
      <button
        type="button"
        class="secondary-button"
        data-action="download-pack"
        data-pack-id="${pack.id}"
      >
        Reintentar
      </button>
    `
  }

  return `
    <button
      type="button"
      class="secondary-button"
      data-action="download-pack"
      data-pack-id="${pack.id}"
    >
      Descargar
    </button>
  `
}
