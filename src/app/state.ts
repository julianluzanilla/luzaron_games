import { applyTheme, loadSettings, saveSettings } from './settings'
import type { AppState, AppUser, ConnectionMode, Route } from './types'
import type { UserSettings } from './settings'
import { CURRENT_USER_STORAGE_KEY, getUserById } from './users'
import type { LevelUpdateProgress } from '../core/level-catalog-types'
import type { DownloadedPack } from '../core/db-types'

const initialSettings = loadSettings()
const initialUser = getUserById(window.localStorage.getItem(CURRENT_USER_STORAGE_KEY))

let state: AppState = {
  route: 'home',
  currentUser: initialUser,
  settings: initialSettings,
  connectionMode: 'checking',
  levelUpdate: {
    mode: 'idle',
    message: 'Actualización pendiente',
    completedPacks: 0,
    totalPacks: 0,
  },
  packs: [],
}

applyTheme(initialSettings)

type Listener = (state: AppState) => void

const listeners = new Set<Listener>()

export function getState(): AppState {
  return state
}

export function setConnectionMode(connectionMode: ConnectionMode): void {
  state = {
    ...state,
    connectionMode,
  }

  notify()
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

export function setLevelUpdate(levelUpdate: LevelUpdateProgress): void {
  state = {
    ...state,
    levelUpdate,
  }

  notify()
}

function notify(): void {
  listeners.forEach((listener) => listener(state))
}

export function setPacks(packs: DownloadedPack[]): void {
  state = {
    ...state,
    packs,
  }

  notify()
}
