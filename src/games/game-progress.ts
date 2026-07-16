import type { GameId } from '../app/types'
import type { GameProgress } from '../core/db-types'
import { autoSaveProgress } from '../core/autosave'
import {
  createProgressId,
  deleteProgress,
  getProgressById,
  getProgressByStatus,
  getProgressByUser,
} from '../core/progress-repository'

export interface SaveGameProgressInput {
  userId: string
  gameId: GameId
  packId: string
  levelId: string
  state: unknown
  elapsedMs: number
  status?: GameProgress['status']
  queueForSync?: boolean
}

export function getGameProgressId(
  userId: string,
  gameId: GameId,
  packId: string,
  levelId: string
): string {
  return createProgressId(userId, gameId, packId, levelId)
}

export async function saveGameProgress(input: SaveGameProgressInput): Promise<string> {
  return autoSaveProgress({
    userId: input.userId,
    gameId: input.gameId,
    packId: input.packId,
    levelId: input.levelId,
    state: input.state,
    elapsedMs: Math.max(0, input.elapsedMs),
    status: input.status ?? 'in-progress',
    queueForSync: input.queueForSync,
  })
}

export async function completeGameProgress(input: SaveGameProgressInput): Promise<string> {
  return saveGameProgress({
    ...input,
    status: 'completed',
  })
}

export async function loadGameProgress(
  userId: string,
  gameId: GameId,
  packId: string,
  levelId: string
): Promise<GameProgress | undefined> {
  const progressId = getGameProgressId(userId, gameId, packId, levelId)

  return getProgressById(progressId)
}

export async function clearGameProgress(
  userId: string,
  gameId: GameId,
  packId: string,
  levelId: string
): Promise<void> {
  const progressId = getGameProgressId(userId, gameId, packId, levelId)

  await deleteProgress(progressId)
}

export async function getUserProgress(userId: string): Promise<GameProgress[]> {
  return getProgressByUser(userId)
}

export async function getCompletedProgress(): Promise<GameProgress[]> {
  return getProgressByStatus('completed')
}

export function hasSavedProgress(progress: GameProgress | undefined): boolean {
  return Boolean(progress && progress.status === 'in-progress')
}

export function isCompletedProgress(progress: GameProgress | undefined): boolean {
  return Boolean(progress && progress.status === 'completed')
}
