import { applyTheme, loadSettings, saveSettings } from './settings'
import type { AppState, AppUser, Route } from './types'
import type { UserSettings } from './settings'

export const guestUser: AppUser = {
  id: 'guest',
  name: 'Invitado',
  avatar: '👤',
  isGuest: true,
}

const initialSettings = loadSettings()

let state: AppState = {
  route: 'home',
  currentUser: guestUser,
  settings: initialSettings,
}

applyTheme(initialSettings)

type Listener = (state: AppState) => void

const listeners = new Set<Listener>()

export function getState(): AppState {
  return state
}

export function setRoute(route: Route): void {
  state = {
    ...state,
    route,
  }

  notify()
}

export function setCurrentUser(user: AppUser): void {
  state = {
    ...state,
    currentUser: user,
  }

  notify()
}

export function updateSettings(nextSettings: Partial<UserSettings>): void {
  const settings: UserSettings = {
    ...state.settings,
    ...nextSettings,
  }

  saveSettings(settings)
  applyTheme(settings)

  state = {
    ...state,
    settings,
  }

  notify()
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

function notify(): void {
  listeners.forEach((listener) => listener(state))
}
