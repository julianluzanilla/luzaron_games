import type { GameId } from '../app/types'
import { saveGameProgress } from './game-progress'

export interface AutoSaveAfterMoveInput<TState> {
  userId: string
  gameId: GameId
  packId: string
  levelId: string
  state: TState
  elapsedMs: number
  queueForSync?: boolean
}

export interface AutoSaveAfterMoveResult {
  progressId: string
  savedAt: string
}

export async function autoSaveAfterMove<TState>(
  input: AutoSaveAfterMoveInput<TState>
): Promise<AutoSaveAfterMoveResult> {
  const progressId = await saveGameProgress({
    userId: input.userId,
    gameId: input.gameId,
    packId: input.packId,
    levelId: input.levelId,
    state: input.state,
    elapsedMs: input.elapsedMs,
    status: 'in-progress',
    queueForSync: input.queueForSync,
  })

  return {
    progressId,
    savedAt: new Date().toISOString(),
  }
}

export function shouldAutoSaveAfterMove<TState>(previousState: TState, nextState: TState): boolean {
  return !Object.is(previousState, nextState)
}
