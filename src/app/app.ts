import {
  getState,
  setCurrentUser,
  setRoute,
  subscribe,
  updateSettings,
  setLevelUpdate,
  setPacks,
  setSelectedPack,
  setAppFocusStatus,
} from './state'
import type { AppState, Route } from './types'
import type { ThemeMode } from './settings'
import { navigateTo, startRouter } from './router'
import { renderHomeScreen } from '../ui/screens/home'
import { renderUsersScreen } from '../ui/screens/users'
import { renderLibraryScreen } from '../ui/screens/library'
import { renderRecordsScreen } from '../ui/screens/records'
import { renderSettingsScreen } from '../ui/screens/settings'
import { renderGamePlaceholder } from '../ui/screens/game-placeholder'
import { localUsers } from './users'
import { saveCurrentSessionFromState } from '../core/session-repository'
import { getAllPacks } from '../core/packs-repository'
import { downloadPackById } from '../core/pack-downloader'
import { getLevelsByPack } from '../core/levels-repository'
import { getCurrentFocusStatus } from '../games/focus-manager'

const appRootElement = document.querySelector<HTMLDivElement>('#app')

if (!appRootElement) {
  throw new Error('App root element not found')
}

const appRoot: HTMLDivElement = appRootElement

export function mountApp(): void {
  appRoot.addEventListener('click', handleAppClick)
  appRoot.addEventListener('change', handleAppChange)

  window.addEventListener('blur', handleFocusChange)
  window.addEventListener('focus', handleFocusChange)
  document.addEventListener('visibilitychange', handleFocusChange)

  subscribe((state) => {
    renderApp(state)
    void saveCurrentSessionFromState(state)
  })

  startRouter((route) => {
    setRoute(route)
  })
}

function handleFocusChange(): void {
  setAppFocusStatus(getCurrentFocusStatus())
}

function handleAppClick(event: MouseEvent): void {
  const target = event.target as HTMLElement

  const packButton = target.closest<HTMLButtonElement>('[data-action="download-pack"]')

  if (packButton) {
    void handleDownloadPackClick(packButton)
    return
  }

  const selectPackButton = target.closest<HTMLButtonElement>('[data-action="select-pack"]')

  if (selectPackButton) {
    void handleSelectPackClick(selectPackButton)
    return
  }

  const closePackSelectorButton = target.closest<HTMLButtonElement>(
    '[data-action="close-pack-selector"]'
  )

  if (closePackSelectorButton) {
    setSelectedPack(null, [])
    return
  }

  const routeButton = target.closest<HTMLElement>('[data-route]')

  if (routeButton) {
    const route = routeButton.dataset.route as Route | undefined

    if (route) {
      navigateTo(route)
      return
    }
  }

  const userButton = target.closest<HTMLElement>('[data-user-id]')

  if (userButton) {
    const userId = userButton.dataset.userId
    const user = localUsers.find((candidate) => candidate.id === userId)

    if (user) {
      setCurrentUser(user)
    }
  }
}

async function handleDownloadPackClick(button: HTMLButtonElement): Promise<void> {
  const packId = button.dataset.packId

  if (!packId) return

  button.disabled = true

  setLevelUpdate({
    mode: 'updating',
    message: 'Descargando pack...',
    completedPacks: 0,
    totalPacks: 1,
  })

  try {
    await downloadPackById(packId)

    setPacks(await getAllPacks())
    setSelectedPack(null, [])

    setLevelUpdate({
      mode: 'complete',
      message: 'Pack descargado correctamente.',
      completedPacks: 1,
      totalPacks: 1,
    })
  } catch (error) {
    console.error('Pack download failed:', error)

    setPacks(await getAllPacks())
    setSelectedPack(null, [])

    setLevelUpdate({
      mode: 'error',
      message: 'No se pudo descargar el pack.',
      completedPacks: 0,
      totalPacks: 1,
    })
  }
}

async function handleSelectPackClick(button: HTMLButtonElement): Promise<void> {
  const packId = button.dataset.packId

  if (!packId) return

  const levels = await getLevelsByPack(packId)

  setSelectedPack(packId, levels)
}

function handleAppChange(event: Event): void {
  const target = event.target as HTMLInputElement

  if (!target.name) return

  if (target.name === 'themeMode') {
    updateSettings({
      themeMode: target.value as ThemeMode,
    })

    return
  }

  if (target.name === 'soundEnabled') {
    updateSettings({
      soundEnabled: target.checked,
    })

    return
  }

  if (target.name === 'vibrationEnabled') {
    updateSettings({
      vibrationEnabled: target.checked,
    })

    return
  }

  if (target.name === 'reducedMotion') {
    updateSettings({
      reducedMotion: target.checked,
    })
  }
}

function renderApp(state: AppState): void {
  appRoot.innerHTML = `
    <div class="app-shell">
      <div class="app-frame">
        ${renderTopBar(state)}
        ${renderScreen(state.route)}
        ${renderBottomNav(state.route)}
      </div>
    </div>
    
    ${renderPrivacyOverlay(state)}
  `
}

function renderTopBar(state: AppState): string {
  return `
    <header class="top-bar">
      <button class="brand-button" type="button" data-route="home" aria-label="Ir al inicio">
        <span class="brand-mark">👑</span>
        <span>
          <strong>Luzaron Games</strong>
          <small>${state.currentUser.name}</small>
        </span>
      </button>

      <div class="top-status">
        <div class="status-pill">
          ${state.currentUser.isGuest ? 'Invitado' : 'Usuario'}
        </div>

        <div class="status-pill ${state.connectionMode}">
          ${renderConnectionLabel(state.connectionMode)}
        </div>

        <div class="status-pill update-status ${state.levelUpdate.mode}">
          ${state.levelUpdate.message}
        </div>
      </div>
    </header>
  `
}

function renderConnectionLabel(connectionMode: AppState['connectionMode']): string {
  if (connectionMode === 'checking') return 'Revisando conexión'
  if (connectionMode === 'online') return 'Online'
  return 'Offline'
}

function renderScreen(route: Route): string {
  switch (route) {
    case 'home':
      return renderHomeScreen()

    case 'users':
      return renderUsersScreen(getState())

    case 'library':
      return renderLibraryScreen(getState())

    case 'records':
      return renderRecordsScreen()

    case 'settings':
      return renderSettingsScreen(getState())

    case 'queens':
      return renderGamePlaceholder('queens')

    case 'sudoku':
      return renderGamePlaceholder('sudoku')

    case 'wordle':
      return renderGamePlaceholder('wordle')

    default:
      return renderHomeScreen()
  }
}

function renderBottomNav(route: Route): string {
  return `
    <nav class="bottom-nav" aria-label="Navegación principal">
      <button type="button" data-route="users" class="${route === 'users' ? 'active' : ''}">
        Usuarios
      </button>

      <button type="button" data-route="library" class="${route === 'library' ? 'active' : ''}">
        Biblioteca
      </button>

      <button type="button" data-route="records" class="${route === 'records' ? 'active' : ''}">
        Records
      </button>

      <button type="button" data-route="settings" class="${route === 'settings' ? 'active' : ''}">
        Ajustes
      </button>
    </nav>
  `
}

function renderPrivacyOverlay(state: AppState): string {
  if (state.appFocusStatus === 'active') return ''

  return `
    <div class="privacy-overlay" aria-live="polite">
      <div class="privacy-card">
        <p class="eyebrow">Pausa automática</p>
        <h2>Juego pausado</h2>
        <p>
          La partida se pausó porque la app perdió el foco.
          Al volver, se reanudará automáticamente.
        </p>
      </div>
    </div>
  `
}
