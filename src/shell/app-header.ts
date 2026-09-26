/**
 * Header compartido.
 *
 * Reemplaza a la barra de pestañas: dentro de un juego el header es
 * `← Inicio · Nombre del juego · tema · usuario`. El ícono de usuario abre el
 * menú con Ajustes, Editar usuario, Administrar y Cerrar sesión (user-menu.ts).
 * La navegación va por hash (`#/`, `#/queens`, `#/ajustes`), así que funciona
 * aunque el JS todavía no haya enganchado los listeners.
 */

import { getGameEntry, type GameId } from './games'
import { getResolvedTheme } from './theme'
import { icon } from './ui'
import { renderUserButton } from './user-menu'

/**
 * Cambio rápido claro ↔ oscuro, sin salir de la partida. Enseña el tema al
 * que se va a cambiar (luna en claro, sol en oscuro). El clic lo atiende
 * main.ts a nivel documento para que sirva en cualquier pantalla.
 */
export function renderThemeToggleContent(): string {
  const toDark = getResolvedTheme() === 'light'
  return icon(toDark ? 'moon' : 'sun')
}

export function themeToggleLabel(): string {
  return getResolvedTheme() === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'
}

function renderThemeToggle(): string {
  const label = themeToggleLabel()
  return `
    <button type="button" class="header-icon" data-action="toggle-theme"
            aria-label="${label}" title="${label}">${renderThemeToggleContent()}</button>
  `
}

/** Header de la pantalla de inicio: marca + tema + ícono de usuario. */
export function renderHomeHeader(): string {
  return `
    <header class="app-header app-header-home">
      <a class="brand" href="#/" aria-label="Luzaron Games">
        <img class="brand-logo brand-logo-light" src="/brand/horizontal.png" alt="Luzaron Games" />
        <img class="brand-logo brand-logo-dark" src="/brand/horizontal-oscuro.png" alt="" aria-hidden="true" />
      </a>
      <div class="header-actions">
        ${renderThemeToggle()}
        ${renderUserButton()}
      </div>
    </header>
  `
}

/** Header de un juego: volver a inicio, nombre del juego, tema y usuario. */
export function renderGameHeader(active: GameId): string {
  const game = getGameEntry(active)

  return `
    <header class="app-header">
      <a class="header-back" href="#/" data-action="go-home">
        <span class="header-back-icon" aria-hidden="true">${icon('chevron-left')}</span>
        <span class="header-back-label">Inicio</span>
      </a>
      <span class="header-title">
        <span class="header-title-mark" aria-hidden="true" style="background:${game.color}"></span>
        ${game.label}
      </span>
      <div class="header-actions">${renderThemeToggle()}${renderUserButton()}</div>
    </header>
  `
}

/** Header de una pantalla interna (Ajustes, Admin). */
export function renderScreenHeader(title: string, backHref = '#/'): string {
  return `
    <header class="app-header">
      <a class="header-back" href="${backHref}">
        <span class="header-back-icon" aria-hidden="true">${icon('chevron-left')}</span>
        <span class="header-back-label">Atrás</span>
      </a>
      <span class="header-title">${escapeHtml(title)}</span>
      <div class="header-actions" aria-hidden="true"></div>
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
