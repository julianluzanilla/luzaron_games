import type { GameId } from '../app/types'
import type { GameProgress } from './db-types'
import { createProgressId, saveProgress } from './progress-repository'
import { enqueueSyncItem } from './sync-queue-repository'

export interface AutoSaveProgressInput {
  userId: string
  gameId: GameId
  packId: string
  levelId: string
  state: unknown
  elapsedMs: number
  status?: GameProgress['status']
  queueForSync?: boolean
}

export async function autoSaveProgress(input: AutoSaveProgressInput): Promise<string> {
  const now = new Date().toISOString()
  const progressId = createProgressId(input.userId, input.gameId, input.packId, input.levelId)

  const progress: GameProgress = {
    id: progressId,
    userId: input.userId,
    gameId: input.gameId,
    packId: input.packId,
    levelId: input.levelId,
    status: input.status ?? 'in-progress',
    state: input.state,
    elapsedMs: input.elapsedMs,
    updatedAt: now,
  }

  await saveProgress(progress)

  if (input.queueForSync && input.userId !== 'guest') {
    await enqueueSyncItem('progress', progress)
  }

  return progressId
}
