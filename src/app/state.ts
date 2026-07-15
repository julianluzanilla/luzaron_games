import { applyTheme, loadSettings, saveSettings } from './settings'
import type { AppState, AppUser, Route } from './types'
import type { UserSettings } from './settings'
import { CURRENT_USER_STORAGE_KEY, getUserById } from './users'

const initialSettings = loadSettings()
const initialUser = getUserById(window.localStorage.getItem(CURRENT_USER_STORAGE_KEY))

let state: AppState = {
  route: 'home',
  currentUser: initialUser,
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
  window.localStorage.setItem(CURRENT_USER_STORAGE_KEY, user.id)

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
