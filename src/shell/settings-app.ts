/**
 * Ajustes de la webapp.
 *
 * Dos bloques: apariencia (claro / oscuro / automático) y cuenta (entrar,
 * salir, y el acceso al panel de administración si el usuario es admin).
 * Si el backend todavía no tiene ningún usuario, aquí sale el formulario para
 * crear el primer administrador.
 */

import { escapeHtml, renderScreenHeader } from './app-header'
import {
  getThemePreference,
  setThemePreference,
  THEME_OPTIONS,
  type ThemePreference,
} from './theme'
import { getSession, login, logout, onSessionChange, setupFirstAdmin } from './session'
import { ApiError, OfflineError } from './api'

let root: HTMLDivElement | null = null
let unsubscribe: (() => void) | null = null
let busy = false
let message: { kind: 'error' | 'ok'; text: string } | null = null

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  player: 'Jugador',
}

/* ---------------------------------------------------------------------- */
/* Render                                                                  */
/* ---------------------------------------------------------------------- */

function renderThemeSection(): string {
  const current = getThemePreference()

  const options = THEME_OPTIONS.map(
    (option) => `
      <button type="button"
              class="theme-option ${option.value === current ? 'active' : ''}"
              data-action="set-theme" data-theme-value="${option.value}"
              aria-pressed="${option.value === current}">
        <span class="theme-option-swatch theme-swatch-${option.value}" aria-hidden="true"></span>
        <span class="theme-option-label">${option.label}</span>
        <span class="theme-option-hint">${option.hint}</span>
      </button>
    `
  ).join('')

  return `
    <section class="settings-card">
      <h2>Apariencia</h2>
      <p class="settings-help">
        En automático la app sigue al sistema y cambia sola al anochecer.
      </p>
      <div class="theme-options">${options}</div>
    </section>
  `
}

function renderLoginForm(serverReachable: boolean): string {
  return `
    <section class="settings-card">
      <h2>Iniciar sesión</h2>
      <p class="settings-help">
        Sin sesión puedes jugar todo, pero los récords no se guardan ni entran a
        los rankings de la familia.
      </p>
      ${
        serverReachable
          ? ''
          : `<p class="settings-banner settings-banner-warn">
               Sin conexión: no se puede iniciar sesión hasta que vuelva el internet.
             </p>`
      }
      <form class="settings-form" data-form="login">
        <label class="field">
          <span class="field-label">Usuario</span>
          <input name="username" type="text" autocomplete="username" required
                 autocapitalize="none" spellcheck="false" />
        </label>
        <label class="field">
          <span class="field-label">Contraseña</span>
          <input name="password" type="password" autocomplete="current-password"
                 required minlength="4" />
        </label>
        <button type="submit" class="control-button control-button-primary"
                ${busy || !serverReachable ? 'disabled' : ''}>
          ${busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </section>
  `
}

function renderSetupForm(): string {
  return `
    <section class="settings-card">
      <h2>Crear el administrador</h2>
      <p class="settings-help">
        Todavía no hay ningún usuario. Crea el tuyo: desde el panel de
        administración podrás dar de alta al resto de la familia.
      </p>
      <form class="settings-form" data-form="setup">
        <label class="field">
          <span class="field-label">Nombre completo</span>
          <input name="fullName" type="text" required autocomplete="name" />
        </label>
        <label class="field">
          <span class="field-label">Correo</span>
          <input name="email" type="email" required autocomplete="email" />
        </label>
        <label class="field">
          <span class="field-label">Usuario</span>
          <input name="username" type="text" required autocapitalize="none"
                 spellcheck="false" pattern="[A-Za-z0-9_.-]{3,24}" />
          <span class="field-hint">3 a 24 caracteres, sin espacios.</span>
        </label>
        <label class="field">
          <span class="field-label">Contraseña</span>
          <input name="password" type="password" required minlength="4"
                 pattern="[A-Za-z0-9]{4,}" autocomplete="new-password" />
          <span class="field-hint">4 o más, solo letras y números.</span>
        </label>
        <button type="submit" class="control-button control-button-primary" ${busy ? 'disabled' : ''}>
          ${busy ? 'Creando…' : 'Crear administrador'}
        </button>
      </form>
    </section>
  `
}

function renderAccount(): string {
  const { user, serverReachable } = getSession()

  if (!user) return renderLoginForm(serverReachable)

  return `
    <section class="settings-card">
      <h2>Tu cuenta</h2>
      <dl class="settings-facts">
        <div><dt>Nombre</dt><dd>${escapeHtml(user.fullName)}</dd></div>
        <div><dt>Usuario</dt><dd>${escapeHtml(user.username)}</dd></div>
        <div><dt>Correo</dt><dd>${escapeHtml(user.email)}</dd></div>
        <div><dt>Rol</dt><dd>${ROLE_LABEL[user.role] ?? user.role}</dd></div>
      </dl>
      ${
        serverReachable
          ? ''
          : `<p class="settings-banner settings-banner-warn">
               Sin conexión. Sigues identificado y tus récords se guardan aquí;
               se suben solos cuando vuelva el internet.
             </p>`
      }
      <div class="settings-actions">
        ${
          user.role === 'admin'
            ? `<a class="control-button" href="#/admin">Administrar usuarios</a>`
            : ''
        }
        <button type="button" class="control-button" data-action="logout" ${busy ? 'disabled' : ''}>
          Cerrar sesión
        </button>
      </div>
      <p class="settings-help">
        La sesión no caduca: este aparato te recuerda hasta que cierres sesión.
      </p>
    </section>
  `
}

function render(): void {
  if (!root) return

  const { needsSetup, user } = getSession()

  root.innerHTML = `
    <div class="app-shell">
      ${renderScreenHeader('Ajustes')}
      <main class="settings-main">
        ${
          message
            ? `<p class="settings-banner settings-banner-${message.kind}">${escapeHtml(message.text)}</p>`
            : ''
        }
        ${renderThemeSection()}
        ${needsSetup && !user ? renderSetupForm() : renderAccount()}
      </main>
    </div>
  `
}

/* ---------------------------------------------------------------------- */
/* Eventos                                                                 */
/* ---------------------------------------------------------------------- */

function describeError(error: unknown): string {
  if (error instanceof OfflineError) return 'Sin conexión con el servidor.'
  if (error instanceof ApiError) return error.message

  return 'Algo salió mal. Inténtalo otra vez.'
}

function handleClick(event: Event): void {
  const target = event.target as HTMLElement | null
  const themeButton = target?.closest<HTMLButtonElement>('[data-action="set-theme"]')

  if (themeButton) {
    setThemePreference(themeButton.dataset.themeValue as ThemePreference)
    render()
    return
  }

  if (target?.closest('[data-action="logout"]')) {
    busy = true
    message = null
    render()

    void logout().then(() => {
      busy = false
      message = { kind: 'ok', text: 'Sesión cerrada.' }
      render()
    })
  }
}

async function handleSubmit(event: Event): Promise<void> {
  const form = event.target as HTMLFormElement | null
  const kind = form?.dataset.form

  if (!form || (kind !== 'login' && kind !== 'setup')) return

  event.preventDefault()

  const data = new FormData(form)
  const read = (name: string): string => String(data.get(name) ?? '').trim()

  busy = true
  message = null
  render()

  try {
    if (kind === 'login') {
      await login(read('username'), read('password'))
    } else {
      await setupFirstAdmin({
        email: read('email'),
        fullName: read('fullName'),
        username: read('username'),
        password: read('password'),
      })
    }

    message = { kind: 'ok', text: '¡Listo! Tus récords ya se guardan.' }
  } catch (error) {
    message = { kind: 'error', text: describeError(error) }
  } finally {
    busy = false
    render()
  }
}

export function mountSettingsApp(): void {
  const found = document.querySelector<HTMLDivElement>('#app')

  if (!found) throw new Error('No se encontró el elemento #app')

  root = found
  busy = false
  message = null

  root.addEventListener('click', handleClick)
  root.addEventListener('submit', handleSubmit)
  unsubscribe = onSessionChange(() => render())

  render()
}

export function unmountSettingsApp(): void {
  root?.removeEventListener('click', handleClick)
  root?.removeEventListener('submit', handleSubmit)
  unsubscribe?.()
  unsubscribe = null

  if (root) root.innerHTML = ''
  root = null
}
