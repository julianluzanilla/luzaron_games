/**
 * Ícono de usuario + su menú.
 *
 * Sustituye al chip «Invitado / Iniciar sesión» y al engrane de Ajustes. Va en
 * la home y en el header de cada juego.
 *
 * Color del ícono:
 *   gris  → Invitado (siempre, aunque la app ya esté lista sin conexión)
 *   verde → con sesión, bajando la app o una versión nueva
 *   azul  → con sesión y todo descargado: se puede llevar al avión
 *
 * El menú se despliega bajo el ícono (no es otra pantalla): nombre, estado
 * (Actualizado / Actualizando / Desconectado), opciones y la versión al pie.
 */

import { escapeHtml } from './app-header'
import { getOfflineState, onOfflineChange, SYNC_LABEL, syncStatus } from './offline'
import { getCurrentUser, getSession, isAdmin, logout, onSessionChange } from './session'
import { icon } from './ui'
import { APP_VERSION } from './version'

type IconTone = 'guest' | 'online' | 'ready'

let clipCounter = 0
let menu: HTMLDivElement | null = null
let anchor: HTMLButtonElement | null = null

function tone(): IconTone {
  if (!getCurrentUser()) return 'guest'
  return getOfflineState().ready ? 'ready' : 'online'
}

function buttonLabel(): string {
  const user = getCurrentUser()
  const who = user ? user.fullName : 'Invitado'
  return `Menú de usuario: ${who} · ${SYNC_LABEL[syncStatus()]}`
}

/** Silueta en círculo (la que dio Jules): anillo, cabeza y hombros recortados. */
function userGlyph(size = 26): string {
  clipCounter += 1
  const clip = `user-clip-${clipCounter}`

  return `
    <svg class="user-glyph" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <defs><clipPath id="${clip}"><circle cx="12" cy="12" r="10.3" /></clipPath></defs>
      <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" stroke-width="1.6" />
      <circle cx="12" cy="9.2" r="4.3" fill="currentColor" />
      <ellipse cx="12" cy="22.6" rx="8.4" ry="8.8" fill="currentColor" clip-path="url(#${clip})" />
    </svg>
  `
}

/** Botón del header. El clic lo atiende este módulo a nivel documento. */
export function renderUserButton(): string {
  const label = buttonLabel()

  return `
    <button type="button" class="header-icon user-button user-button-${tone()}"
            data-action="user-menu" aria-haspopup="menu" aria-expanded="false"
            aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${userGlyph()}</button>
  `
}

/** Repinta color y etiqueta de todos los íconos sin tocar la pantalla (la partida sigue). */
function refreshButtons(): void {
  const next = tone()
  const label = buttonLabel()

  document.querySelectorAll<HTMLButtonElement>('[data-action="user-menu"]').forEach((button) => {
    button.classList.remove('user-button-guest', 'user-button-online', 'user-button-ready')
    button.classList.add(`user-button-${next}`)
    button.setAttribute('aria-label', label)
    button.title = label
  })

  if (menu) renderMenu()
}

/* ---------------------------------------------------------------------- */
/* Menú                                                                    */
/* ---------------------------------------------------------------------- */

function item(options: {
  label: string
  iconName: Parameters<typeof icon>[0]
  href?: string
  action?: string
  disabled?: boolean
  hint?: string
}): string {
  const body = `${icon(options.iconName, 18)}<span class="user-menu-label">${options.label}</span>${
    options.hint ? `<span class="user-menu-hint">${options.hint}</span>` : ''
  }`

  if (options.disabled) {
    return `<span class="user-menu-item is-disabled" role="menuitem" aria-disabled="true">${body}</span>`
  }

  if (options.href) {
    return `<a class="user-menu-item" role="menuitem" href="${options.href}">${body}</a>`
  }

  return `<button type="button" class="user-menu-item" role="menuitem" data-menu-action="${options.action}">${body}</button>`
}

function renderMenu(): void {
  if (!menu) return

  const user = getCurrentUser()
  const status = syncStatus()
  const offline = status === 'offline'
  const needsNet = 'Requiere internet'

  const items = user
    ? [
        item({
          label: 'Editar usuario',
          iconName: 'user-pen',
          href: '#/cuenta',
          disabled: offline,
          hint: offline ? needsNet : undefined,
        }),
        item({ label: 'Ajustes', iconName: 'settings', href: '#/ajustes' }),
        isAdmin()
          ? item({
              label: 'Administrar',
              iconName: 'users',
              href: '#/admin',
              disabled: offline,
              hint: offline ? needsNet : undefined,
            })
          : '',
        item({
          label: 'Cerrar sesión',
          iconName: 'log-out',
          action: 'logout',
          disabled: offline,
          hint: offline ? needsNet : undefined,
        }),
      ]
    : [
        item({ label: 'Ajustes', iconName: 'settings', href: '#/ajustes' }),
        item({
          label: 'Iniciar sesión',
          iconName: 'log-in',
          href: '#/ajustes',
          disabled: offline,
          hint: offline ? needsNet : undefined,
        }),
      ]

  menu.innerHTML = `
    <div class="user-menu-head">
      <span class="user-menu-name">${escapeHtml(user ? user.fullName : 'Invitado')}</span>
      <span class="user-menu-status user-menu-status-${status}">
        <span class="user-menu-dot" aria-hidden="true"></span>${SYNC_LABEL[status]}
      </span>
    </div>
    <div class="user-menu-items">${items.join('')}</div>
    <div class="user-menu-foot">Versión ${escapeHtml(APP_VERSION.label)}</div>
  `

  position()
}

function position(): void {
  if (!menu || !anchor) return

  const rect = anchor.getBoundingClientRect()
  const width = Math.min(280, window.innerWidth - 16)

  menu.style.width = `${width}px`
  menu.style.top = `${Math.round(rect.bottom + 6)}px`
  menu.style.left = `${Math.round(Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)))}px`
}

function openMenu(button: HTMLButtonElement): void {
  closeMenu()

  anchor = button
  menu = document.createElement('div')
  menu.className = 'user-menu'
  menu.setAttribute('role', 'menu')
  menu.setAttribute('aria-label', 'Menú de usuario')
  document.body.appendChild(menu)

  button.setAttribute('aria-expanded', 'true')
  renderMenu()

  menu
    .querySelector<HTMLElement>('.user-menu-item:not(.is-disabled)')
    ?.focus({ preventScroll: true })
}

export function closeMenu(): void {
  anchor?.setAttribute('aria-expanded', 'false')
  menu?.remove()
  menu = null
  anchor = null
}

function handleDocumentClick(event: MouseEvent): void {
  const target = event.target as HTMLElement | null
  const button = target?.closest<HTMLButtonElement>('[data-action="user-menu"]')

  if (button) {
    const wasOpenHere = menu !== null && anchor === button
    closeMenu()
    if (!wasOpenHere) openMenu(button)
    // Que un Enter posterior (Wordle) no vuelva a "pulsar" el botón.
    button.blur()
    return
  }

  if (!menu) return

  if (!menu.contains(target)) {
    closeMenu()
    return
  }

  const actionButton = target?.closest<HTMLElement>('[data-menu-action]')

  if (actionButton?.dataset.menuAction === 'logout') {
    closeMenu()
    void logout()
    return
  }

  if (target?.closest('a.user-menu-item')) closeMenu()
}

export function initUserMenu(): void {
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu) {
      const button = anchor
      closeMenu()
      button?.focus()
    }
  })
  window.addEventListener('hashchange', closeMenu)
  window.addEventListener('resize', position)
  window.addEventListener('scroll', position, { passive: true })

  onSessionChange(() => refreshButtons())
  onOfflineChange(() => refreshButtons())
  window.addEventListener('online', refreshButtons)
  window.addEventListener('offline', refreshButtons)

  // La sesión cacheada puede llegar después del primer pintado.
  if (!getSession().loading) refreshButtons()
}
