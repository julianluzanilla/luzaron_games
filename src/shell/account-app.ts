/**
 * Editar usuario (`#/cuenta`), desde el menú del ícono.
 *
 * El usuario cambia su nombre visible y/o su contraseña. Cambiar la contraseña
 * pide la actual y cierra la sesión en sus otros aparatos. Necesita internet:
 * sin red el formulario se enseña deshabilitado.
 */

import { escapeHtml, renderScreenHeader } from './app-header'
import { ApiError, OfflineError } from './api'
import { getOfflineState, onOfflineChange } from './offline'
import { getCurrentUser, getSession, onSessionChange, updateProfile } from './session'
import { icon } from './ui'

let root: HTMLDivElement | null = null
let unsubscribers: (() => void)[] = []
let busy = false
let message: { kind: 'error' | 'ok'; text: string } | null = null

function isOffline(): boolean {
  return !getOfflineState().online || !getSession().serverReachable
}

function submitButton(label: string, disabled: boolean): string {
  return `
    <button type="submit" class="control-button control-button-primary" ${disabled ? 'disabled' : ''}>
      <span class="control-button-label">${label}</span>
      <span class="control-button-trail">${icon('arrow-right')}</span>
    </button>
  `
}

function render(): void {
  if (!root) return

  const user = getCurrentUser()
  const offline = isOffline()
  const locked = busy || offline

  const body = !user
    ? `<section class="settings-card">
         <h2>Sin sesión</h2>
         <p class="settings-help">Inicia sesión desde <a href="#/ajustes">Ajustes</a> para editar tu usuario.</p>
       </section>`
    : `
      ${
        offline
          ? `<p class="settings-banner settings-banner-warn">
               Sin conexión: para editar tu usuario hace falta internet.
             </p>`
          : ''
      }
      <section class="settings-card">
        <h2>Nombre visible</h2>
        <p class="settings-help">Es el que sale en el menú y en los rankings de la familia.</p>
        <form class="settings-form" data-form="name">
          <label class="field">
            <span class="field-label">Nombre completo</span>
            <input name="fullName" type="text" required minlength="2" maxlength="80"
                   autocomplete="name" value="${escapeHtml(user.fullName)}" ${locked ? 'disabled' : ''} />
          </label>
          ${submitButton(busy ? 'Guardando…' : 'Guardar nombre', locked)}
        </form>
      </section>

      <section class="settings-card">
        <h2>Contraseña</h2>
        <p class="settings-help">
          Al cambiarla se cierra tu sesión en los demás aparatos; en éste sigues dentro.
        </p>
        <form class="settings-form" data-form="password">
          <input type="text" name="username" autocomplete="username" value="${escapeHtml(user.username)}" hidden />
          <label class="field">
            <span class="field-label">Contraseña actual</span>
            <input name="currentPassword" type="password" required autocomplete="current-password" ${locked ? 'disabled' : ''} />
          </label>
          <label class="field">
            <span class="field-label">Contraseña nueva</span>
            <input name="newPassword" type="password" required minlength="4"
                   pattern="[A-Za-z0-9]{4,}" autocomplete="new-password" ${locked ? 'disabled' : ''} />
            <span class="field-hint">4 o más, solo letras y números.</span>
          </label>
          <label class="field">
            <span class="field-label">Repite la nueva</span>
            <input name="confirmPassword" type="password" required minlength="4"
                   autocomplete="new-password" ${locked ? 'disabled' : ''} />
          </label>
          ${submitButton(busy ? 'Guardando…' : 'Cambiar contraseña', locked)}
        </form>
      </section>
    `

  root.innerHTML = `
    <div class="app-shell">
      ${renderScreenHeader('Editar usuario')}
      <main class="settings-main">
        ${
          message
            ? `<p class="settings-banner settings-banner-${message.kind}">${escapeHtml(message.text)}</p>`
            : ''
        }
        ${body}
      </main>
    </div>
  `
}

function describeError(error: unknown): string {
  if (error instanceof OfflineError) return 'Sin conexión con el servidor.'
  if (error instanceof ApiError) return error.message

  return 'Algo salió mal. Inténtalo otra vez.'
}

async function handleSubmit(event: Event): Promise<void> {
  const form = event.target as HTMLFormElement | null
  const kind = form?.dataset.form

  if (!form || (kind !== 'name' && kind !== 'password')) return

  event.preventDefault()
  if (busy) return

  const data = new FormData(form)
  const read = (name: string): string => String(data.get(name) ?? '').trim()

  if (kind === 'password' && read('newPassword') !== read('confirmPassword')) {
    message = { kind: 'error', text: 'La contraseña nueva no coincide en los dos campos.' }
    render()
    return
  }

  busy = true
  message = null
  render()

  try {
    if (kind === 'name') {
      await updateProfile({ fullName: read('fullName') })
      message = { kind: 'ok', text: 'Nombre actualizado.' }
    } else {
      await updateProfile({
        currentPassword: read('currentPassword'),
        newPassword: read('newPassword'),
      })
      message = { kind: 'ok', text: 'Contraseña cambiada.' }
    }
  } catch (error) {
    message = { kind: 'error', text: describeError(error) }
  } finally {
    busy = false
    render()
  }
}

export function mountAccountApp(): void {
  const found = document.querySelector<HTMLDivElement>('#app')

  if (!found) throw new Error('No se encontró el elemento #app')

  root = found
  busy = false
  message = null

  root.addEventListener('submit', handleSubmit)
  unsubscribers = [onSessionChange(() => render()), onOfflineChange(() => render())]

  render()
}

export function unmountAccountApp(): void {
  root?.removeEventListener('submit', handleSubmit)
  unsubscribers.forEach((unsubscribe) => unsubscribe())
  unsubscribers = []

  if (root) root.innerHTML = ''
  root = null
}
