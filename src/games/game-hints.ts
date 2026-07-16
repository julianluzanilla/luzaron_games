export type HintSeverity = 'info' | 'success' | 'warning' | 'error'

export interface BoardCellPosition {
  row: number
  column: number
}

export interface GameHint {
  id: string
  type: string
  title: string
  message: string
  severity: HintSeverity
  cells?: BoardCellPosition[]
}

export interface HintState {
  hintsUsed: number
  lastHint: GameHint | null
  isOpen: boolean
}

export interface HintRequestOptions {
  maxHints?: number
}

export interface HintRequestResult {
  hintState: HintState
  hint: GameHint | null
  wasApplied: boolean
  reason?: 'max-hints-reached' | 'no-hint-available'
}

export type HintResolver<TState> = (state: TState) => GameHint | null

export function createHintState(): HintState {
  return {
    hintsUsed: 0,
    lastHint: null,
    isOpen: false,
  }
}

export function resetHints(): HintState {
  return createHintState()
}

export function closeHint(hintState: HintState): HintState {
  return {
    ...hintState,
    isOpen: false,
  }
}

export function requestHint<TState>(
  state: TState,
  hintState: HintState,
  resolver: HintResolver<TState>,
  options: HintRequestOptions = {}
): HintRequestResult {
  const maxHints = options.maxHints ?? Number.POSITIVE_INFINITY

  if (hintState.hintsUsed >= maxHints) {
    return {
      hintState,
      hint: null,
      wasApplied: false,
      reason: 'max-hints-reached',
    }
  }

  const hint = resolver(state)

  if (!hint) {
    return {
      hintState,
      hint: null,
      wasApplied: false,
      reason: 'no-hint-available',
    }
  }

  const nextHintState: HintState = {
    hintsUsed: hintState.hintsUsed + 1,
    lastHint: hint,
    isOpen: true,
  }

  return {
    hintState: nextHintState,
    hint,
    wasApplied: true,
  }
}

export function createTextHint(
  id: string,
  title: string,
  message: string,
  severity: HintSeverity = 'info'
): GameHint {
  return {
    id,
    type: 'text',
    title,
    message,
    severity,
  }
}

export function createCellHint(
  id: string,
  title: string,
  message: string,
  cells: BoardCellPosition[],
  severity: HintSeverity = 'info'
): GameHint {
  return {
    id,
    type: 'cell',
    title,
    message,
    severity,
    cells,
  }
}
