import type { UserSettings } from './settings'

export type Route =
  'home' | 'users' | 'library' | 'records' | 'settings' | 'queens' | 'sudoku' | 'wordle'

export type GameId = 'queens' | 'sudoku' | 'wordle'

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
}
