export interface MoveHistory<TState> {
  past: TState[]
  present: TState
  future: TState[]
}

export function createMoveHistory<TState>(initialState: TState): MoveHistory<TState> {
  return {
    past: [],
    present: initialState,
    future: [],
  }
}

export function pushMove<TState>(
  history: MoveHistory<TState>,
  nextState: TState
): MoveHistory<TState> {
  return {
    past: [...history.past, history.present],
    present: nextState,
    future: [],
  }
}

export function undoMove<TState>(history: MoveHistory<TState>): MoveHistory<TState> {
  const previousState = history.past.at(-1)

  if (!previousState) return history

  return {
    past: history.past.slice(0, -1),
    present: previousState,
    future: [history.present, ...history.future],
  }
}

export function redoMove<TState>(history: MoveHistory<TState>): MoveHistory<TState> {
  const nextState = history.future[0]

  if (!nextState) return history

  return {
    past: [...history.past, history.present],
    present: nextState,
    future: history.future.slice(1),
  }
}

export function resetMoveHistory<TState>(initialState: TState): MoveHistory<TState> {
  return createMoveHistory(initialState)
}

export function canUndo<TState>(history: MoveHistory<TState>): boolean {
  return history.past.length > 0
}

export function canRedo<TState>(history: MoveHistory<TState>): boolean {
  return history.future.length > 0
}
