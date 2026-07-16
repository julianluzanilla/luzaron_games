export interface GameTimerState {
  elapsedMs: number
  startedAtMs: number | null
  isRunning: boolean
}

export function createGameTimer(initialElapsedMs = 0): GameTimerState {
  return {
    elapsedMs: initialElapsedMs,
    startedAtMs: null,
    isRunning: false,
  }
}

export function startGameTimer(timer: GameTimerState, nowMs = Date.now()): GameTimerState {
  if (timer.isRunning) return timer

  return {
    ...timer,
    startedAtMs: nowMs,
    isRunning: true,
  }
}

export function pauseGameTimer(timer: GameTimerState, nowMs = Date.now()): GameTimerState {
  if (!timer.isRunning || timer.startedAtMs === null) return timer

  return {
    elapsedMs: timer.elapsedMs + (nowMs - timer.startedAtMs),
    startedAtMs: null,
    isRunning: false,
  }
}

export function resetGameTimer(): GameTimerState {
  return createGameTimer()
}

export function getCurrentElapsedMs(timer: GameTimerState, nowMs = Date.now()): number {
  if (!timer.isRunning || timer.startedAtMs === null) {
    return timer.elapsedMs
  }

  return timer.elapsedMs + (nowMs - timer.startedAtMs)
}

export function formatElapsedTime(elapsedMs: number): string {
  const totalSeconds = Math.floor(elapsedMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
