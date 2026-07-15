import type { GameId } from '../app/types'
import type { PackDifficulty } from './db-types'

export interface LevelCatalogManifest {
  version: number
  updatedAt: string
  packs: LevelCatalogPack[]
}

export interface LevelCatalogPack {
  id: string
  gameId: GameId
  title: string
  category?: string
  difficulty?: PackDifficulty
  sortOrder?: number
  version: number
  levelCount: number
  fileUrl: string
  checksum?: string
}

export interface LevelPackFile {
  packId: string
  gameId: GameId
  version: number
  levels: unknown[]
}

export type LevelUpdateMode = 'idle' | 'checking' | 'updating' | 'complete' | 'error' | 'offline'

export interface LevelUpdateProgress {
  mode: LevelUpdateMode
  message: string
  completedPacks: number
  totalPacks: number
}

export interface LevelUpdateSummary {
  totalPacks: number
  downloadedPacks: number
  skippedPacks: number
}
