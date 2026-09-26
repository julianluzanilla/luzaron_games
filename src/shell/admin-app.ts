/**
 * Panel de administración.
 *
 * Solo para el rol `admin`. Tres bloques:
 * - Usuarios: dar de alta a la familia, activar o desactivar cuentas y reponer
 *   contraseñas olvidadas.
 * - Juegos: interruptor global para ocultar un juego a todos (p. ej. uno en
 *   desarrollo). Sigue en el build y el admin lo puede probar.
 * - Versión: la que corre, la guardada en el aparato y la publicada.
 * No hay auto-registro; nadie entra
 * si el admin no lo creó (PRODUCT_SPEC §5).
 *
 * Necesita internet: es la única pantalla que no funciona offline, porque
 * escribe directo en la base.
 */

import { escapeHtml, renderScreenHeader } from './app-header'
import {
  ApiError,
  apiCreateUser,
  apiListUsers,
  apiUpdateUser,
  OfflineError,
  type ApiUser,
} from './api'
import { getCurrentUser } from './session'
import { icon } from './ui'
import { GAMES, type GameId } from './games'
import {
  isGameEnabled,
  onGameSettingsChange,
  refreshGameSettings,
  setGameEnabled,
} from './game-settings'
import { getOfflineState, onOfflineChange } from './offline'
import { APP_VERSION, fetchPublishedVersion, type AppVersion } from './version'

let root: HTMLDivElement | null = null
let users: ApiUser[] = []
let loading = true
let busy = false
let message: { kind: 'error' | 'ok'; text: string } | null = null
let published: AppVersion | null | undefined = undefined
let unsubscribers: (() => void)[] = []

function renderGamesSection(): string {
  const rows = GAMES.filter((game) => game.available)
    .map((game) => {
      const enabled = isGameEnabled(game.id)
      return `
        <li class="user-row ${enabled ? '' : 'user-row-inactive'}">
          <div class="user-row-main">
            <span class="user-row-name">
              <span class="header-title-mark" aria-hidden="true" style="background:${game.color}"></span>
              ${game.label}
            </span>
            <span class="user-row-meta">${enabled ? 'Visible para todos' : '<strong>Oculto</strong> · solo tú lo ves'}</span>
          </div>
          <div class="user-row-actions">
            <button type="button" class="chip-button" data-action="toggle-game"
                    data-game-id="${game.id}" data-next="${enabled ? 'false' : 'true'}"
                    aria-pressed="${enabled}" ${busy ? 'disabled' : ''}>
              ${enabled ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
        </li>
      `
    })
    .join('')

  return `
    <section class="settings-card">
      <h2>Juegos</h2>
      <p class="settings-help">
        Un juego oculto desaparece de la pantalla de inicio para todos. Sus
        récords no se borran y tú lo sigues viendo para probarlo.
      </p>
      <ul class="user-list">${rows}</ul>
    </section>
  `
}

function renderVersionSection(): string {
  const { cachedVersion, ready } = getOfflineState()
  const publishedLabel =
    published === undefined ? 'Consultando…' : published ? published.label : 'Sin conexión'
  const behind = published && published.label !== APP_VERSION.label

  return `
    <section class="settings-card">
      <h2>Versión</h2>
      <dl class="settings-facts">
        <div><dt>En uso</dt><dd>${escapeHtml(APP_VERSION.label)}</dd></div>
        <div><dt>Guardada en este aparato</dt><dd>${
          cachedVersion ? escapeHtml(cachedVersion) + (ready ? '' : ' (incompleta)') : 'Todavía no'
        }</dd></div>
        <div><dt>Publicada</dt><dd>${escapeHtml(publishedLabel)}</dd></div>
      </dl>
      <p class="settings-help settings-help-small">
        ${
          behind
            ? 'Hay una versión más nueva publicada: se descarga sola y entra la próxima vez que abras la app.'
            : 'Fecha y hora del último cambio (hora de Hermosillo) y su código de commit.'
        }
      </p>
    </section>
  `
}

function renderUserRow(user: ApiUser): string {
  const isSelf = user.id === getCurrentUser()?.id

  return `
    <li class="user-row ${user.isActive ? '' : 'user-row-inactive'}">
      <div class="user-row-main">
        <span class="user-row-name">${escapeHtml(user.fullName)}</span>
        <span class="user-row-meta">
          @${escapeHtml(user.username)} · ${user.role === 'admin' ? 'Administrador' : 'Jugador'}
          ${user.isActive ? '' : ' · <strong>inactivo</strong>'}
        </span>
      </div>
      <div class="user-row-actions">
        <button type="button" class="chip-button" data-action="reset-password"
                data-user-id="${user.id}" ${busy ? 'disabled' : ''}>
          Contraseña
        </button>
        <button type="button" class="chip-button" data-action="toggle-active"
                data-user-id="${user.id}" data-next="${user.isActive ? 'false' : 'true'}"
                ${busy || isSelf ? 'disabled' : ''}
                title="${isSelf ? 'No puedes desactivar tu propia cuenta' : ''}">
          ${user.isActive ? 'Desactivar' : 'Activar'}
        </button>
      </div>
    </li>
  `
}

function render(): void {
  if (!root) return

  root.innerHTML = `
    <div class="app-shell">
      ${renderScreenHeader('Administración')}
      <main class="settings-main">
        ${
          message
            ? `<p class="settings-banner settings-banner-${message.kind}">${escapeHtml(message.text)}</p>`
            : ''
        }

        <section class="settings-card">
          <div class="settings-card-head">
            <h2>Usuarios</h2>
            <span class="settings-card-meta">${loading ? '' : `${users.length} ${users.length === 1 ? 'usuario' : 'usuarios'}`}</span>
          </div>
          ${
            loading
              ? '<p class="settings-help">Cargando…</p>'
              : users.length === 0
                ? '<p class="settings-help">Todavía no hay más usuarios.</p>'
                : `<ul class="user-list">${users.map(renderUserRow).join('')}</ul>`
          }
        </section>

        <section class="settings-card">
          <h2>Agregar usuario</h2>
          <form class="settings-form" data-form="create-user">
            <label class="field">
              <span class="field-label">Nombre completo</span>
              <input name="fullName" type="text" required />
            </label>
            <label class="field">
              <span class="field-label">Correo</span>
              <input name="email" type="email" required />
            </label>
            <label class="field">
              <span class="field-label">Usuario</span>
              <input name="username" type="text" required autocapitalize="none"
                     spellcheck="false" pattern="[A-Za-z0-9_.-]{3,24}" />
            </label>
            <label class="field">
              <span class="field-label">Contraseña</span>
              <input name="password" type="text" required minlength="4"
                     pattern="[A-Za-z0-9]{4,}" />
              <span class="field-hint">
                4 o más, solo letras y números. Se la dictas y ya; se puede cambiar después.
              </span>
            </label>
            <label class="field">
              <span class="field-label">Rol</span>
              <select name="role">
                <option value="player" selected>Jugador</option>
                <option value="admin">Administrador</option>
              </select>
            </label>
            <button type="submit" class="control-button control-button-primary" ${busy ? 'disabled' : ''}>
              ${icon('plus')}<span class="control-button-label">${busy ? 'Guardando…' : 'Agregar usuario'}</span>
            </button>
          </form>
        </section>

        ${renderGamesSection()}
        ${renderVersionSection()}
      </main>
    </div>
  `
}

function describeError(error: unknown): string {
  if (error instanceof OfflineError) return 'Sin conexión: esta pantalla necesita internet.'
  if (error instanceof ApiError) return error.message

  return 'Algo salió mal. Inténtalo otra vez.'
}

async function refresh(): Promise<void> {
  loading = true
  render()

  try {
    const result = await apiListUsers()
    users = result.users
  } catch (error) {
    message = { kind: 'error', text: describeError(error) }
  } finally {
    loading = false
    render()
  }
}

async function handleClick(event: Event): Promise<void> {
  const target = event.target as HTMLElement | null
  const gameButton = target?.closest<HTMLButtonElement>('[data-action="toggle-game"]')

  if (gameButton && !busy) {
    busy = true
    message = null
    render()

    try {
      const enabled = gameButton.dataset.next === 'true'
      await setGameEnabled(gameButton.dataset.gameId as GameId, enabled)
      message = { kind: 'ok', text: enabled ? 'Juego visible otra vez.' : 'Juego oculto.' }
    } catch (error) {
      message = { kind: 'error', text: describeError(error) }
    } finally {
      busy = false
      render()
    }

    return
  }

  const button = target?.closest<HTMLButtonElement>('[data-user-id]')

  if (!button || busy) return

  const userId = button.dataset.userId ?? ''
  const action = button.dataset.action

  if (action === 'toggle-active') {
    busy = true
    message = null
    render()

    try {
      await apiUpdateUser(userId, { isActive: button.dataset.next === 'true' })
      await refresh()
      message = { kind: 'ok', text: 'Usuario actualizado.' }
    } catch (error) {
      message = { kind: 'error', text: describeError(error) }
    } finally {
      busy = false
      render()
    }

    return
  }

  if (action === 'reset-password') {
    const password = window.prompt('Nueva contraseña (4 o más, letras y números):')

    if (!password) return

    if (!/^[A-Za-z0-9]{4,}$/.test(password)) {
      message = { kind: 'error', text: 'La contraseña debe ser 4 o más letras o números.' }
      render()
      return
    }

    busy = true
    message = null
    render()

    try {
      await apiUpdateUser(userId, { password })
      message = { kind: 'ok', text: 'Contraseña cambiada.' }
    } catch (error) {
      message = { kind: 'error', text: describeError(error) }
    } finally {
      busy = false
      render()
    }
  }
}

async function handleSubmit(event: Event): Promise<void> {
  const form = event.target as HTMLFormElement | null

  if (form?.dataset.form !== 'create-user') return

  event.preventDefault()

  const data = new FormData(form)
  const read = (name: string): string => String(data.get(name) ?? '').trim()

  busy = true
  message = null
  render()

  try {
    await apiCreateUser({
      email: read('email'),
      fullName: read('fullName'),
      username: read('username'),
      password: read('password'),
      role: read('role') === 'admin' ? 'admin' : 'player',
    })

    await refresh()
    message = { kind: 'ok', text: 'Usuario creado.' }
  } catch (error) {
    message = { kind: 'error', text: describeError(error) }
  } finally {
    busy = false
    render()
  }
}

export function mountAdminApp(): void {
  const found = document.querySelector<HTMLDivElement>('#app')

  if (!found) throw new Error('No se encontró el elemento #app')

  root = found
  users = []
  loading = true
  busy = false
  message = null

  root.addEventListener('click', handleClick)
  root.addEventListener('submit', handleSubmit)

  published = undefined
  unsubscribers = [onGameSettingsChange(() => render()), onOfflineChange(() => render())]

  render()
  void refresh()
  void refreshGameSettings()
  void fetchPublishedVersion().then((version) => {
    published = version
    render()
  })
}

export function unmountAdminApp(): void {
  root?.removeEventListener('click', handleClick)
  root?.removeEventListener('submit', handleSubmit)
  unsubscribers.forEach((unsubscribe) => unsubscribe())
  unsubscribers = []

  if (root) root.innerHTML = ''
  root = null
}
