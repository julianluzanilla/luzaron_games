/**
 * Header compartido.
 *
 * Reemplaza a la barra de pestañas: dentro de un juego el header es
 * `← Inicio · Nombre del juego · ⚙`. La navegación va por hash (`#/`,
 * `#/queens`, `#/ajustes`), así que funciona aunque el JS todavía no haya
 * enganchado los listeners.
 */

import { getGameEntry, type GameId } from './games'
import { displayName, getCurrentUser } from './session'

const GEAR_ICON = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <circle cx="12" cy="12" r="3.2"/>
  <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 8.9 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.7 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.7 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.7a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 15 4.7a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.3 9v.03a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>
</svg>`

const BACK_ICON = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M15 5l-7 7 7 7"/>
</svg>`

/** Botón de ajustes, igual en todas las pantallas. */
function renderSettingsButton(): string {
  return `
    <a class="header-icon" href="#/ajustes" data-action="open-settings"
       aria-label="Ajustes" title="Ajustes">${GEAR_ICON}</a>
  `
}

/** Chip de identidad. Para invitado invita a entrar; con sesión da el nombre. */
export function renderUserChip(): string {
  const user = getCurrentUser()

  if (!user) {
    return `
      <a class="user-chip user-chip-guest" href="#/ajustes">
        <span class="user-chip-avatar" aria-hidden="true">?</span>
        <span class="user-chip-text">
          <span class="user-chip-name">Invitado</span>
          <span class="user-chip-hint">Iniciar sesión</span>
        </span>
      </a>
    `
  }

  const initial = (user.fullName.trim()[0] ?? user.username[0] ?? '?').toUpperCase()

  return `
    <a class="user-chip" href="#/ajustes">
      <span class="user-chip-avatar" aria-hidden="true">${initial}</span>
      <span class="user-chip-text">
        <span class="user-chip-name">${escapeHtml(displayName())}</span>
        <span class="user-chip-hint">Tus récords se guardan</span>
      </span>
    </a>
  `
}

/** Header de la pantalla de inicio: marca + identidad + ajustes. */
export function renderHomeHeader(): string {
  return `
    <header class="app-header app-header-home">
      <span class="brand">
        <span class="brand-mark" aria-hidden="true">◆</span>
        <span class="brand-name">Luzaron Games</span>
      </span>
      <div class="header-actions">
        ${renderUserChip()}
        ${renderSettingsButton()}
      </div>
    </header>
  `
}

/** Header de un juego: volver a inicio, nombre del juego y ajustes. */
export function renderGameHeader(active: GameId): string {
  const game = getGameEntry(active)

  return `
    <header class="app-header">
      <a class="header-back" href="#/" data-action="go-home">
        <span class="header-back-icon" aria-hidden="true">${BACK_ICON}</span>
        <span class="header-back-label">Inicio</span>
      </a>
      <span class="header-title">
        <span class="header-title-mark" aria-hidden="true">${game.mark}</span>
        ${game.label}
      </span>
      <div class="header-actions">${renderSettingsButton()}</div>
    </header>
  `
}

/** Header de una pantalla interna (Ajustes, Admin). */
export function renderScreenHeader(title: string, backHref = '#/'): string {
  return `
    <header class="app-header">
      <a class="header-back" href="${backHref}">
        <span class="header-back-icon" aria-hidden="true">${BACK_ICON}</span>
        <span class="header-back-label">Atrás</span>
      </a>
      <span class="header-title">${escapeHtml(title)}</span>
      <div class="header-actions"></div>
    </header>
  `
}

/** Todo lo que viene del usuario o del servidor pasa por aquí antes de ir al DOM. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
