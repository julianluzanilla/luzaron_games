/**
 * Panel de administración.
 *
 * Solo para el rol `admin`: dar de alta a la familia, activar o desactivar
 * cuentas y reponer contraseñas olvidadas. No hay auto-registro; nadie entra
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

let root: HTMLDivElement | null = null
let users: ApiUser[] = []
let loading = true
let busy = false
let message: { kind: 'error' | 'ok'; text: string } | null = null

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
      ${renderScreenHeader('Usuarios', '#/ajustes')}
      <main class="settings-main">
        ${
          message
            ? `<p class="settings-banner settings-banner-${message.kind}">${escapeHtml(message.text)}</p>`
            : ''
        }

        <section class="settings-card">
          <h2>Familia</h2>
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
              ${busy ? 'Guardando…' : 'Crear usuario'}
            </button>
          </form>
        </section>
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

  render()
  void refresh()
}

export function unmountAdminApp(): void {
  root?.removeEventListener('click', handleClick)
  root?.removeEventListener('submit', handleSubmit)

  if (root) root.innerHTML = ''
  root = null
}
