import type { GameId } from '../app/types'

export type GameSessionStatus = 'idle' | 'playing' | 'paused' | 'completed'

export interface LevelSummary {
  id: string
  packId: string
  gameId: GameId
  number: number
  title: string
}

export interface GameSession<TState = unknown> {
  id: string
  userId: string
  gameId: GameId
  packId: string
  levelId: string
  status: GameSessionStatus
  state: TState
  elapsedMs: number
  startedAt: string
  updatedAt: string
}

export interface GameResult {
  userId: string
  gameId: GameId
  packId: string
  levelId: string
  rawTimeMs: number
  finalTimeMs: number
  hintsUsed: number
  hintPenaltyMs: number
  completedAt: string
}
