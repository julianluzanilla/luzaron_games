/**
 * Pantalla de inicio.
 *
 * Es la raíz de la app (`#/`): cuatro miniaturas cuadradas para elegir juego,
 * el chip de identidad y el acceso a Ajustes. Nada más — se entra a jugar en
 * un toque.
 */

import { GAMES } from './games'
import { renderHomeHeader } from './app-header'
import { getBestTime } from './records'
import { getCurrentUser, onSessionChange } from './session'

/** Categoría cuyo mejor tiempo se enseña bajo cada tarjeta, si existe. */
const HIGHLIGHT_PACK: Record<string, string> = {
  queens: 'queens-8x8',
  sudoku: 'sudoku-classic-normal',
  mahjong: 'mahjong-turtle',
}

let root: HTMLDivElement | null = null
let unsubscribe: (() => void) | null = null

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function renderCard(game: (typeof GAMES)[number]): string {
  const pack = HIGHLIGHT_PACK[game.id]
  const best = pack ? getBestTime(game.id, pack) : null

  const footer = best
    ? `<span class="game-card-best">Mejor ${formatTime(best)}</span>`
    : `<span class="game-card-tagline">${game.tagline}</span>`

  return `
    <a class="game-card ${game.available ? '' : 'game-card-soon'}"
       href="${game.available ? `#/${game.id}` : '#/'}"
       ${game.available ? '' : 'aria-disabled="true"'}>
      <span class="game-thumb game-thumb-${game.id}">
        ${game.thumbnail}
        ${game.available ? '' : '<span class="game-card-badge">Pronto</span>'}
      </span>
      <span class="game-card-body">
        <span class="game-card-name">${game.label}</span>
        ${footer}
      </span>
    </a>
  `
}

function render(): void {
  if (!root) return

  const isGuest = getCurrentUser() === null

  root.innerHTML = `
    <div class="app-shell">
      ${renderHomeHeader()}
      <main class="home-main">
        <h1 class="home-title">¿Qué jugamos?</h1>
        <div class="game-grid">${GAMES.map(renderCard).join('')}</div>
        ${
          isGuest
            ? `<p class="home-note">
                 Estás jugando como invitado: puedes jugar todo, pero los récords
                 no se guardan. <a href="#/ajustes">Inicia sesión</a> para guardarlos.
               </p>`
            : ''
        }
      </main>
    </div>
  `
}

export function mountHomeApp(): void {
  const found = document.querySelector<HTMLDivElement>('#app')

  if (!found) throw new Error('No se encontró el elemento #app')

  root = found
  unsubscribe = onSessionChange(() => render())
  render()
}

export function unmountHomeApp(): void {
  unsubscribe?.()
  unsubscribe = null

  if (root) root.innerHTML = ''
  root = null
}
