import type { AppUser } from '../app/types'

export interface LocalProfile extends AppUser {
  createdAt: string
  updatedAt: string
}

export interface LocalSession {
  id: string
  currentUserId: string
  updatedAt: string
}

export interface DownloadedPack {
  id: string
  gameId: 'queens' | 'sudoku' | 'wordle'
  title: string
  version: number
  status: 'available' | 'downloading' | 'downloaded' | 'update-available' | 'error'
  levelCount: number
  downloadedAt?: string
  updatedAt: string
}

export interface LocalLevel {
  id: string
  packId: string
  gameId: 'queens' | 'sudoku' | 'wordle'
  data: unknown
  createdAt: string
}

export interface GameProgress {
  id: string
  userId: string
  gameId: 'queens' | 'sudoku' | 'wordle'
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
  gameId: 'queens' | 'sudoku' | 'wordle'
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
