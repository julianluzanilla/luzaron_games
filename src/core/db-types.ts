import type { AppUser, GameId, Route } from '../app/types'

export type PackDifficulty = 'easy' | 'medium' | 'hard' | 'mixed'

export interface LocalProfile extends AppUser {
  createdAt: string
  updatedAt: string
}

export interface LocalSession {
  id: string
  currentUserId: string
  route: Route
  updatedAt: string
}

export interface DownloadedPack {
  id: string
  gameId: GameId
  title: string
  category: string
  difficulty: PackDifficulty
  sortOrder: number
  version: number
  status: 'available' | 'downloading' | 'downloaded' | 'update-available' | 'error'
  levelCount: number
  fileUrl: string
  checksum?: string
  downloadedAt?: string
  updatedAt: string
}

export interface LocalLevel {
  id: string
  packId: string
  gameId: GameId
  data: unknown
  createdAt: string
}

export interface GameProgress {
  id: string
  userId: string
  gameId: GameId
  packId: string
  levelId: string
  status: 'not-started' | 'in-progress' | 'completed'
  state: unknown
  elapsedMs: number
  updatedAt: string
}

export interface LocalRecord {
  id: string
  userId: string
  gameId: GameId
  packId: string
  levelId: string
  rawTimeMs: number
  finalTimeMs: number
  hintsUsed: number
  hintPenaltyMs: number
  isCleanRecord: boolean
  completedAt: string
  syncedAt?: string
}

export interface SyncQueueItem {
  id: string
  type: 'record' | 'progress' | 'profile'
  payload: unknown
  status: 'pending' | 'syncing' | 'error'
  createdAt: string
  updatedAt: string
}
