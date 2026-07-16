import type { GameId } from '../app/types'
import { clearGameProgress } from './game-progress'
import { createGameTimer } from './game-timer'
import type { GameTimerState } from './game-timer'
import { createMoveHistory } from './move-history'
import type { MoveHistory } from './move-history'

export interface ResetGameStateResult<TState> {
  state: TState
  timer: GameTimerState
  history: MoveHistory<TState>
  hintsUsed: number
  isDirty: boolean
}

export interface ResetSavedProgressInput {
  userId: string
  gameId: GameId
  packId: string
  levelId: string
}

export interface ResetGameSessionInput<TState> extends ResetSavedProgressInput {
  initialState: TState
  clearSavedProgress?: boolean
}

export function createResetGameState<TState>(initialState: TState): ResetGameStateResult<TState> {
  return {
    state: initialState,
    timer: createGameTimer(),
    history: createMoveHistory(initialState),
    hintsUsed: 0,
    isDirty: false,
  }
}

export async function resetSavedGameProgress(input: ResetSavedProgressInput): Promise<void> {
  await clearGameProgress(input.userId, input.gameId, input.packId, input.levelId)
}

export async function resetGameSession<TState>(
  input: ResetGameSessionInput<TState>
): Promise<ResetGameStateResult<TState>> {
  if (input.clearSavedProgress !== false) {
    await resetSavedGameProgress({
      userId: input.userId,
      gameId: input.gameId,
      packId: input.packId,
      levelId: input.levelId,
    })
  }

  return createResetGameState(input.initialState)
}
