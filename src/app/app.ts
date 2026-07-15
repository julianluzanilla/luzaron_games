import { getState, setCurrentUser, setRoute, subscribe, updateSettings } from './state'
import type { AppState, Route } from './types'
import { navigateTo, startRouter } from './router'
import { renderHomeScreen } from '../ui/screens/home'
import { renderUsersScreen } from '../ui/screens/users'
import { renderLibraryScreen } from '../ui/screens/library'
import { renderRecordsScreen } from '../ui/screens/records'
import { renderSettingsScreen } from '../ui/screens/settings'
import { renderGamePlaceholder } from '../ui/screens/game-placeholder'
import { localUsers } from './users'
import type { ThemeMode } from './settings'

const appRootElement = document.querySelector<HTMLDivElement>('#app')

if (!appRootElement) {
  throw new Error('App root element not found')
}

const appRoot: HTMLDivElement = appRootElement

export function mountApp(): void {
  appRoot.addEventListener('click', handleAppClick)
  appRoot.addEventListener('change', handleAppChange)

  subscribe(renderApp)

  startRouter((route) => {
    setRoute(route)
  })
}

function handleAppClick(event: MouseEvent): void {
  const target = event.target as HTMLElement

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

      <div class="status-pill">
        ${state.currentUser.isGuest ? 'Invitado' : 'Usuario'}
      </div>
    </header>
  `
}

function renderScreen(route: Route): string {
  switch (route) {
    case 'home':
      return renderHomeScreen()

    case 'users':
      return renderUsersScreen(getState())

    case 'library':
      return renderLibraryScreen()

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
