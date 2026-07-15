import type { UserSettings } from './settings'

export type Route =
  'home' | 'users' | 'library' | 'records' | 'settings' | 'queens' | 'sudoku' | 'wordle'

export type GameId = 'queens' | 'sudoku' | 'wordle'

export type ConnectionMode = 'checking' | 'online' | 'offline'

export interface AppUser {
  id: string
  name: string
  avatar: string
  isGuest: boolean
}

export interface AppState {
  route: Route
  currentUser: AppUser
  settings: UserSettings
  connectionMode: ConnectionMode
}
