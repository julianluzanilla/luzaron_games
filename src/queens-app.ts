import {
  applyQueensCellCycle,
  applyQueensManualX,
  getQueensConflictKeys,
} from './games/queens/queens-engine'
import { renderQueensBoard } from './games/queens/queens-board-renderer'
import { createBoardStateFromPuzzle } from './games/queens/queens-level'
import { getQueensHint, type QueensHint } from './games/queens/queens-hints'
import { pickNextPuzzle, loadAvailableSizes, type PoolSizeEntry } from './games/queens/queens-pool'
import type { QueensBoardState } from './games/queens/queens-types'

const BEST_TIME_PREFIX = 'luzaron-queens-best-v1:'
const LAST_SIZE_KEY = 'luzaron-queens-last-size-v1'
const MAX_HISTORY = 200

interface AppState {
  availableSizes: PoolSizeEntry[]
  size: number
  puzzleNumber: number
  puzzleCount: number
  board: QueensBoardState | null
  history: QueensBoardState[]
  hintsUsed: number
  hintTier: number
  activeHint: QueensHint | null
  elapsedMs: number
  timerRunning: boolean
  isWindowFocused: boolean
  isCompleted: boolean
  isLoading: boolean
  errorMessage: string | null
  pendingReset: boolean
}

const state: AppState = {
  availableSizes: [],
  size: 7,
  puzzleNumber: 0,
  puzzleCount: 0,
  board: null,
  history: [],
  hintsUsed: 0,
  hintTier: 0,
  activeHint: null,
  elapsedMs: 0,
  timerRunning: false,
  isWindowFocused: document.hasFocus(),
  isCompleted: false,
  isLoading: true,
  errorMessage: null,
  pendingReset: false,
}

let timerStartedAt = 0
let timerHandle: number | null = null
let dragActive = false
let dragPointerId: number | null = null
let dragLastCell: string | null = null
let dragHistoryPushed = false

let root: HTMLDivElement

export function mountQueensApp(): void {
  const found = document.querySelector<HTMLDivElement>('#app')

  if (!found) throw new Error('No se encontró el elemento #app')

  root = found

  root.addEventListener('click', handleClick)
  root.addEventListener('pointerdown', handlePointerDown)
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
  window.addEventListener('pointercancel', resetDragState)
  window.addEventListener('blur', handleFocusChange)
  window.addEventListener('focus', handleFocusChange)
  document.addEventListener('visibilitychange', handleFocusChange)

  render()
  void initialize()
}

async function initialize(): Promise<void> {
  try {
    const sizes = await loadAvailableSizes()

    state.availableSizes = sizes

    const storedSize = Number(window.localStorage.getItem(LAST_SIZE_KEY))
    const preferredSize = sizes.find((entry) => entry.size === storedSize) ? storedSize : sizes[0]?.size

    if (preferredSize) {
      await startNewPuzzle(preferredSize)
    } else {
      state.errorMessage = 'No hay puzzles disponibles todavía.'
      state.isLoading = false
      render()
    }
  } catch (error) {
    console.error(error)
    state.errorMessage = 'No se pudieron cargar los puzzles. Revisa tu conexión e intenta de nuevo.'
    state.isLoading = false
    render()
  }
}

async function startNewPuzzle(size: number): Promise<void> {
  state.isLoading = true
  state.errorMessage = null
  render()

  try {
    const { puzzle, puzzleNumber } = await pickNextPuzzle(size)
    const pack = state.availableSizes.find((entry) => entry.size === size)

    state.size = size
    state.board = createBoardStateFromPuzzle(puzzle, puzzleNumber)
    state.puzzleNumber = puzzleNumber
    state.puzzleCount = pack?.count ?? 0
    state.history = []
    state.hintsUsed = 0
    state.hintTier = 0
    state.activeHint = null
    state.isCompleted = false
    state.isLoading = false

    window.localStorage.setItem(LAST_SIZE_KEY, String(size))

    resetTimer()
    startTimer()
  } catch (error) {
    console.error(error)
    state.errorMessage = `No se pudo cargar un puzzle de ${size}x${size}.`
    state.isLoading = false
  }

  render()
}

// ---------- Timer ----------

function startTimer(): void {
  if (state.timerRunning) return

  state.timerRunning = true
  timerStartedAt = Date.now() - state.elapsedMs

  if (timerHandle !== null) window.clearInterval(timerHandle)

  timerHandle = window.setInterval(() => {
    if (!state.timerRunning) return
    state.elapsedMs = Date.now() - timerStartedAt
    renderTimerOnly()
  }, 250)
}

function pauseTimer(): void {
  if (!state.timerRunning) return

  state.timerRunning = false

  if (timerHandle !== null) {
    window.clearInterval(timerHandle)
    timerHandle = null
  }
}

function resetTimer(): void {
  pauseTimer()
  state.elapsedMs = 0
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

// ---------- Focus / pause overlay ----------

function handleFocusChange(): void {
  const isFocused = document.hasFocus() && document.visibilityState === 'visible'

  if (isFocused === state.isWindowFocused) return

  state.isWindowFocused = isFocused

  if (!isFocused) {
    pauseTimer()
  } else if (!state.isCompleted && state.board) {
    startTimer()
  }

  render()
}

// ---------- Best times ----------

function readBestTime(size: number): number | null {
  const raw = window.localStorage.getItem(BEST_TIME_PREFIX + size)
  return raw ? Number(raw) : null
}

function maybeSaveBestTime(size: number, ms: number): boolean {
  const current = readBestTime(size)

  if (current === null || ms < current) {
    window.localStorage.setItem(BEST_TIME_PREFIX + size, String(ms))
    return true
  }

  return false
}

// ---------- Board interaction ----------

function pushHistory(board: QueensBoardState): void {
  state.history.push(cloneBoard(board))

  if (state.history.length > MAX_HISTORY) state.history.shift()
}

function cloneBoard(board: QueensBoardState): QueensBoardState {
  return {
    ...board,
    cells: board.cells.map((row) => row.map((cell) => ({ ...cell }))),
  }
}

function checkCompletion(board: QueensBoardState): boolean {
  const queenCount = board.cells.flat().filter((cell) => cell.value === 'queen').length

  if (queenCount !== board.size) return false

  return getQueensConflictKeys(board).size === 0
}

function handleCellClick(row: number, column: number): void {
  if (!state.board || state.isCompleted) return

  pushHistory(state.board)
  state.board = applyQueensCellCycle(state.board, row, column)
  state.activeHint = null
  state.hintTier = 0

  if (checkCompletion(state.board)) {
    completePuzzle()
  }

  render()
}

function handleCellDragX(row: number, column: number): void {
  if (!state.board || state.isCompleted) return

  if (!dragHistoryPushed) {
    pushHistory(state.board)
    dragHistoryPushed = true
  }

  state.board = applyQueensManualX(state.board, row, column)
  state.activeHint = null
  state.hintTier = 0
  render()
}

function completePuzzle(): void {
  state.isCompleted = true
  pauseTimer()

  const isNewBest = maybeSaveBestTime(state.size, state.elapsedMs)

  window.setTimeout(() => showCompletionModal(isNewBest), 150)
}

function undo(): void {
  if (state.isCompleted) return

  const previous = state.history.pop()

  if (!previous) return

  state.board = previous
  state.activeHint = null
  state.hintTier = 0
  render()
}

function requestReset(): void {
  if (!state.board) return
  state.pendingReset = true
  render()
}

function confirmReset(): void {
  if (!state.board) return

  state.board = {
    ...state.board,
    cells: state.board.cells.map((row) =>
      row.map((cell) => ({
        row: cell.row,
        column: cell.column,
        regionId: cell.regionId,
        value: 'empty' as const,
      }))
    ),
  }
  state.history = []
  state.hintsUsed = 0
  state.hintTier = 0
  state.activeHint = null
  state.isCompleted = false
  state.pendingReset = false

  resetTimer()
  startTimer()
  render()
}

function cancelReset(): void {
  state.pendingReset = false
  render()
}

function useHint(): void {
  if (!state.board || state.isCompleted) return

  const hint = getQueensHint(state.board, state.hintTier)

  state.activeHint = hint
  state.hintsUsed += 1
  state.hintTier = Math.min(state.hintTier + 1, 3)

  render()
}

// ---------- Completion modal ----------

function showCompletionModal(isNewBest: boolean): void {
  render(isNewBest)
}

// ---------- Event wiring ----------

function handleClick(event: MouseEvent): void {
  const target = event.target as HTMLElement

  const sizeButton = target.closest<HTMLButtonElement>('[data-action="select-size"]')
  if (sizeButton) {
    const size = Number(sizeButton.dataset.size)
    if (size && size !== state.size) void startNewPuzzle(size)
    return
  }

  if (target.closest('[data-action="undo"]')) {
    undo()
    return
  }

  if (target.closest('[data-action="request-reset"]')) {
    requestReset()
    return
  }

  if (target.closest('[data-action="confirm-reset"]')) {
    confirmReset()
    return
  }

  if (target.closest('[data-action="cancel-reset"]')) {
    cancelReset()
    return
  }

  if (target.closest('[data-action="hint"]')) {
    useHint()
    return
  }

  if (target.closest('[data-action="next-puzzle"]')) {
    void startNewPuzzle(state.size)
    return
  }

  if (target.closest('[data-action="close-modal"]')) {
    state.isCompleted = false
    render()
    return
  }

  const cellButton = target.closest<HTMLButtonElement>('[data-action="queens-cell"]')

  if (cellButton && !dragActive) {
    const row = Number(cellButton.dataset.row)
    const column = Number(cellButton.dataset.column)
    handleCellClick(row, column)
  }
}

function getCellFromTarget(target: EventTarget | null): HTMLButtonElement | null {
  if (!(target instanceof HTMLElement)) return null
  return target.closest<HTMLButtonElement>('[data-action="queens-cell"]')
}

function getCellFromPoint(x: number, y: number): HTMLButtonElement | null {
  const element = document.elementFromPoint(x, y)
  if (!(element instanceof HTMLElement)) return null
  return element.closest<HTMLButtonElement>('[data-action="queens-cell"]')
}

function handlePointerDown(event: PointerEvent): void {
  const cell = getCellFromTarget(event.target)
  if (!cell) return

  event.preventDefault()

  dragActive = true
  dragPointerId = event.pointerId
  dragLastCell = null
  dragHistoryPushed = false
}

function handlePointerMove(event: PointerEvent): void {
  if (!dragActive || event.pointerId !== dragPointerId) return
  if (event.pointerType === 'mouse' && event.buttons === 0) {
    resetDragState()
    return
  }

  const cell = getCellFromPoint(event.clientX, event.clientY)
  if (!cell) return

  const row = Number(cell.dataset.row)
  const column = Number(cell.dataset.column)
  const key = `${row}:${column}`

  if (key === dragLastCell) return

  dragLastCell = key
  handleCellDragX(row, column)
}

function handlePointerUp(event: PointerEvent): void {
  if (!dragActive || event.pointerId !== dragPointerId) return
  resetDragState()
}

function resetDragState(): void {
  dragActive = false
  dragPointerId = null
  dragLastCell = null
  dragHistoryPushed = false
}

// ---------- Rendering ----------

function renderTimerOnly(): void {
  const el = root.querySelector('[data-timer]')
  if (el) el.textContent = formatTime(state.elapsedMs)
}

function render(justWonWithBest = false): void {
  root.innerHTML = `
    <div class="app-shell">
      ${renderHeader()}
      ${renderMain()}
    </div>
    ${state.pendingReset ? renderResetConfirm() : ''}
    ${state.isCompleted ? renderCompletionModal(justWonWithBest) : ''}
    ${!state.isWindowFocused && state.board && !state.isCompleted ? renderPauseOverlay() : ''}
  `

  applyHintHighlight()
}

function applyHintHighlight(): void {
  const position = state.activeHint?.position

  if (!position) return

  const selector = `[data-action="queens-cell"][data-row="${position.row}"][data-column="${position.column}"]`
  const cell = root.querySelector(selector)

  cell?.classList.add('hint-target')
}

function renderHeader(): string {
  const sizeChips = state.availableSizes
    .map(
      (entry) => `
        <button
          type="button"
          class="size-chip ${entry.size === state.size ? 'active' : ''}"
          data-action="select-size"
          data-size="${entry.size}"
        >${entry.size}×${entry.size}</button>
      `
    )
    .join('')

  return `
    <header class="app-header">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true">♛</span>
        <div>
          <p class="brand-title">Queens</p>
          <p class="brand-subtitle">Luzaron Games</p>
        </div>
      </div>

      <div class="timer" aria-label="Tiempo transcurrido">
        <span class="timer-value" data-timer>${formatTime(state.elapsedMs)}</span>
      </div>
    </header>

    <nav class="size-selector" aria-label="Tamaño del tablero">
      ${sizeChips}
    </nav>
  `
}

function renderMain(): string {
  if (state.errorMessage) {
    return `<div class="state-message state-error">${state.errorMessage}</div>`
  }

  if (state.isLoading || !state.board) {
    return `<div class="state-message">Generando tablero…</div>`
  }

  return `
    <div class="puzzle-meta">
      <span>Puzzle ${state.puzzleNumber} de ${state.puzzleCount}</span>
      ${renderBestTime()}
    </div>

    <div class="board-stage">
      ${renderQueensBoard(state.board)}
    </div>

    ${state.activeHint ? `<p class="hint-banner">💡 ${state.activeHint.message}</p>` : ''}

    <div class="controls">
      <button type="button" class="control-button" data-action="undo" ${state.history.length === 0 ? 'disabled' : ''}>
        ↺ Deshacer
      </button>
      <button type="button" class="control-button" data-action="request-reset">
        ⟲ Reset
      </button>
      <button type="button" class="control-button" data-action="hint">
        💡 Hint
      </button>
    </div>
  `
}

function renderBestTime(): string {
  const best = readBestTime(state.size)
  if (best === null) return ''
  return `<span class="best-time">Mejor: ${formatTime(best)}</span>`
}

function renderResetConfirm(): string {
  return `
    <div class="modal-overlay" role="dialog" aria-modal="true">
      <div class="modal-card">
        <h2>¿Reiniciar este puzzle?</h2>
        <p>Se borrará todo lo que llevas y el tiempo volverá a cero.</p>
        <div class="modal-actions">
          <button type="button" class="control-button" data-action="cancel-reset">Cancelar</button>
          <button type="button" class="control-button control-button-primary" data-action="confirm-reset">
            Sí, reiniciar
          </button>
        </div>
      </div>
    </div>
  `
}

function renderCompletionModal(justWonWithBest: boolean): string {
  const hasNext = state.puzzleNumber < state.puzzleCount || state.puzzleCount > 0

  return `
    <div class="modal-overlay" role="dialog" aria-modal="true">
      <div class="modal-card modal-card-celebration">
        <p class="eyebrow">¡Puzzle completado!</p>
        <h2>Puzzle ${state.puzzleNumber}</h2>

        <dl class="modal-stats">
          <div>
            <dt>Tiempo</dt>
            <dd>${formatTime(state.elapsedMs)}${justWonWithBest ? ' 🏆' : ''}</dd>
          </div>
          <div>
            <dt>Pistas usadas</dt>
            <dd>${state.hintsUsed}</dd>
          </div>
        </dl>

        <div class="modal-actions">
          <button type="button" class="control-button" data-action="close-modal">Cerrar</button>
          ${
            hasNext
              ? '<button type="button" class="control-button control-button-primary" data-action="next-puzzle">Siguiente Puzzle</button>'
              : ''
          }
        </div>
      </div>
    </div>
  `
}

function renderPauseOverlay(): string {
  return `
    <div class="pause-overlay" aria-live="polite">
      <div class="pause-card">
        <p class="eyebrow">Pausa automática</p>
        <h2>Juego pausado</h2>
        <p>El tablero se oscureció porque la app perdió el foco. Al volver, se reanuda solo.</p>
      </div>
    </div>
  `
}
