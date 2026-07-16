import type { UserSettings } from './settings'
import type { LevelUpdateProgress } from '../core/level-catalog-types'
import type { DownloadedPack, LocalLevel } from '../core/db-types'
import type { AppFocusStatus } from '../games/focus-manager'

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
  levelUpdate: LevelUpdateProgress
  packs: DownloadedPack[]
  selectedPackId: string | null
  selectedPackLevels: LocalLevel[]
  appFocusStatus: AppFocusStatus
}
