/**
 * Pantalla de Sudoku: Mini 6×6 y Clásico 9×9, tres dificultades, timer,
 * pistas y puzzles precargados o generados al vuelo.
 *
 * Reglas visuales acordadas:
 * - Los números precargados y los del jugador se distinguen por color
 *   (variables --sudoku-given / --sudoku-user en style.css).
 * - Solo se marcan los conflictos de regla (repetido en fila, columna o
 *   caja). Un número equivocado pero legal no se delata.
 * - Al completar una fila, columna o caja se dispara un destello que dura
 *   menos de un segundo y no deja rastro.
 */

import {
  createSudokuBoardState,
  getSudokuConflicts,
  getUnitsCompletedBy,
  isSudokuSolved,
  resetSudokuBoardState,
  revealSudokuValue,
  setSudokuValue,
  type SudokuBoardState,
} from './games/sudoku/sudoku-engine'
import { renderSudokuBoard, renderSudokuPad } from './games/sudoku/sudoku-board-renderer'
import { findEasiestEmptyCell } from './games/sudoku/sudoku-solver'
import { generateFreshSudoku, pickSequentialSudoku } from './games/sudoku/sudoku-pool'
import {
  DIFFICULTY_LABELS,
  SUDOKU_DIFFICULTIES,
  SUDOKU_VARIANTS,
  VARIANT_LABELS,
  columnOf,
  rowOf,
  type SudokuDifficulty,
  type SudokuVariant,
} from './games/sudoku/sudoku-types'
import { renderGameHeader } from './shell/app-header'
import { getBestTime, submitRecord } from './shell/records'

const SETTINGS_KEY = 'luzaron-sudoku-settings-v1'
const FLASH_MS = 850

interface AppState {
  variant: SudokuVariant
  difficulty: SudokuDifficulty
  board: SudokuBoardState | null
  puzzleNumber: number
  puzzleCount: number
  selected: number | null
  conflicts: Set<number>
  flashing: Set<number>
  hinted: number | null
  hintsUsed: number
  elapsedMs: number
  timerRunning: boolean
  timerStarted: boolean
  isWindowFocused: boolean
  pausedByBlur: boolean
  isCompleted: boolean
  isLoading: boolean
  errorMessage: string | null
  pendingReset: boolean
}

const state: AppState = {
  variant: 'classic',
  difficulty: 'normal',
  board: null,
  puzzleNumber: 0,
  puzzleCount: 0,
  selected: null,
  conflicts: new Set(),
  flashing: new Set(),
  hinted: null,
  hintsUsed: 0,
  elapsedMs: 0,
  timerRunning: false,
  timerStarted: false,
  isWindowFocused: true,
  pausedByBlur: false,
  isCompleted: false,
  isLoading: true,
  errorMessage: null,
  pendingReset: false,
}

let root: HTMLDivElement | null = null
let timerStartedAt = 0
let timerHandle: number | null = null
let flashHandle: number | null = null

// ---------- Ciclo de vida ----------

export function mountSudokuApp(): void {
  const found = document.querySelector<HTMLDivElement>('#app')

  if (!found) throw new Error('No se encontró el elemento #app')

  root = found
  readSettings()

  state.isWindowFocused = document.hasFocus()

  root.addEventListener('click', handleClick)
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('blur', handleFocusChange)
  window.addEventListener('focus', handleFocusChange)
  document.addEventListener('visibilitychange', handleFocusChange)

  render()
  void loadPuzzle('sequential', false)
}

export function unmountSudokuApp(): void {
  root?.removeEventListener('click', handleClick)
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('blur', handleFocusChange)
  window.removeEventListener('focus', handleFocusChange)
  document.removeEventListener('visibilitychange', handleFocusChange)

  pauseTimer()

  if (flashHandle !== null) {
    window.clearTimeout(flashHandle)
    flashHandle = null
  }

  if (root) root.innerHTML = ''
  root = null
}

// ---------- Preferencias ----------

function readSettings(): void {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    if (!raw) return

    const parsed = JSON.parse(raw) as Partial<AppState>

    if (parsed.variant && SUDOKU_VARIANTS.includes(parsed.variant)) state.variant = parsed.variant
    if (parsed.difficulty && SUDOKU_DIFFICULTIES.includes(parsed.difficulty)) {
      state.difficulty = parsed.difficulty
    }
  } catch {
    // Preferencias corruptas: se usan las de fábrica.
  }
}

function writeSettings(): void {
  try {
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ variant: state.variant, difficulty: state.difficulty })
    )
  } catch {
    // Sin almacenamiento: las preferencias solo duran la sesión.
  }
}

/**
 * Los mejores tiempos los lleva `shell/records.ts` (por usuario, en IndexedDB
 * y sincronizados con el backend). La categoria del Sudoku es variante +
 * dificultad, igual que antes.
 */
function packId(): string {
  return `sudoku-${state.variant}-${state.difficulty}`
}

function readBestTime(): number | null {
  return getBestTime('sudoku', packId())
}

function maybeSaveBestTime(ms: number): boolean {
  return submitRecord({
    gameId: 'sudoku',
    packId: packId(),
    levelId: String(state.puzzleNumber),
    rawTimeMs: ms,
    hintsUsed: state.hintsUsed,
  }).isNewBest
}

// ---------- Carga de puzzles ----------

type LoadMode = 'sequential' | 'fresh'

async function loadPuzzle(mode: LoadMode, advanceCursor = true): Promise<void> {
  state.isLoading = true
  state.errorMessage = null
  render()

  // Un tick para que el "Generando tablero…" alcance a pintarse antes de
  // que la generación bloquee el hilo.
  await new Promise((resolve) => window.setTimeout(resolve, 0))

  try {
    const picked =
      mode === 'fresh'
        ? generateFreshSudoku(state.variant, state.difficulty)
        : await pickSequentialSudoku(state.variant, state.difficulty, advanceCursor)

    state.board = createSudokuBoardState(picked.puzzle, picked.puzzleNumber)
    state.puzzleNumber = picked.puzzleNumber
    state.puzzleCount = picked.puzzleCount
    state.selected = null
    state.conflicts = new Set()
    state.flashing = new Set()
    state.hinted = null
    state.hintsUsed = 0
    state.isCompleted = false
    state.pendingReset = false
    state.isLoading = false

    resetTimer()
  } catch (error) {
    console.error(error)
    state.errorMessage = 'No se pudo preparar el puzzle. Intenta de nuevo.'
    state.isLoading = false
  }

  render()
}

// ---------- Timer ----------

function startTimer(): void {
  if (state.timerRunning || state.isCompleted) return

  state.timerRunning = true
  state.timerStarted = true
  timerStartedAt = Date.now() - state.elapsedMs

  if (timerHandle !== null) window.clearInterval(timerHandle)

  timerHandle = window.setInterval(() => {
    if (!state.timerRunning) return
    state.elapsedMs = Date.now() - timerStartedAt
    renderTimerOnly()
  }, 250)
}

function pauseTimer(): void {
  if (timerHandle !== null) {
    window.clearInterval(timerHandle)
    timerHandle = null
  }

  state.timerRunning = false
}

function resetTimer(): void {
  pauseTimer()
  state.elapsedMs = 0
  state.timerStarted = false
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function handleFocusChange(): void {
  const isFocused = document.hasFocus() && document.visibilityState === 'visible'

  if (isFocused === state.isWindowFocused) return

  state.isWindowFocused = isFocused

  if (!isFocused) {
    state.pausedByBlur = state.timerRunning
    pauseTimer()
  } else if (state.pausedByBlur) {
    state.pausedByBlur = false
    if (!state.isCompleted && state.board) startTimer()
  }

  render()
}

// ---------- Jugadas ----------

function writeValue(index: number, value: number): void {
  const board = state.board

  if (!board || state.isCompleted) return
  if (board.given[index]) return

  const next = value === 0 ? setSudokuValue(board, index, 0) : setSudokuValue(board, index, value)

  if (next === board) return

  if (!state.timerStarted) startTimer()

  const completedUnits = value === 0 ? [] : getUnitsCompletedBy(board, next, index)

  state.board = next
  state.hinted = null
  state.conflicts = getSudokuConflicts(next)

  // El destello solo celebra zonas correctas: si la zona quedó llena pero
  // con repetidos, no es logro.
  const celebrate = completedUnits.filter((unit) =>
    unit.cells.every((cell) => !state.conflicts.has(cell))
  )

  if (celebrate.length > 0) flashCells(celebrate.flatMap((unit) => unit.cells))

  if (isSudokuSolved(next)) {
    completePuzzle()
    return
  }

  render()
}

function flashCells(cells: number[]): void {
  state.flashing = new Set(cells)

  if (flashHandle !== null) window.clearTimeout(flashHandle)

  flashHandle = window.setTimeout(() => {
    state.flashing = new Set()
    flashHandle = null
    render()
  }, FLASH_MS)
}

function completePuzzle(): void {
  state.isCompleted = true
  state.flashing = new Set()
  pauseTimer()

  if (flashHandle !== null) {
    window.clearTimeout(flashHandle)
    flashHandle = null
  }

  const isNewBest = state.hintsUsed === 0 && maybeSaveBestTime(state.elapsedMs)

  render(isNewBest)
}

function useHint(): void {
  const board = state.board

  if (!board || state.isCompleted) return

  const target =
    state.selected !== null && !board.given[state.selected] && board.values[state.selected] === 0
      ? state.selected
      : findEasiestEmptyCell(board.values, board.geometry)

  if (target === null) return

  if (!state.timerStarted) startTimer()

  const next = revealSudokuValue(board, target)
  const completedUnits = getUnitsCompletedBy(board, next, target)

  state.board = next
  state.selected = target
  state.hinted = target
  state.hintsUsed += 1
  state.conflicts = getSudokuConflicts(next)

  const celebrate = completedUnits.filter((unit) =>
    unit.cells.every((cell) => !state.conflicts.has(cell))
  )

  if (celebrate.length > 0) flashCells(celebrate.flatMap((unit) => unit.cells))

  if (isSudokuSolved(next)) {
    completePuzzle()
    return
  }

  render()
}

function confirmReset(): void {
  if (!state.board) return

  state.board = resetSudokuBoardState(state.board)
  state.conflicts = new Set()
  state.flashing = new Set()
  state.hinted = null
  state.hintsUsed = 0
  state.selected = null
  state.isCompleted = false
  state.pendingReset = false

  resetTimer()
  render()
}

function moveSelection(deltaRow: number, deltaColumn: number): void {
  const board = state.board
  if (!board) return

  const { geometry } = board
  const current = state.selected ?? 0
  const row = Math.min(geometry.size - 1, Math.max(0, rowOf(geometry, current) + deltaRow))
  const column = Math.min(geometry.size - 1, Math.max(0, columnOf(geometry, current) + deltaColumn))

  state.selected = row * geometry.size + column
  render()
}

// ---------- Eventos ----------

function handleClick(event: MouseEvent): void {
  const target = event.target as HTMLElement | null
  if (!target) return

  const variantButton = target.closest<HTMLButtonElement>('[data-action="sudoku-variant"]')
  if (variantButton) {
    const variant = variantButton.dataset.variant as SudokuVariant

    if (variant !== state.variant) {
      state.variant = variant
      writeSettings()
      void loadPuzzle('sequential', false)
    }
    return
  }

  const difficultyButton = target.closest<HTMLButtonElement>('[data-action="sudoku-difficulty"]')
  if (difficultyButton) {
    const difficulty = difficultyButton.dataset.difficulty as SudokuDifficulty

    if (difficulty !== state.difficulty) {
      state.difficulty = difficulty
      writeSettings()
      void loadPuzzle('sequential', false)
    }
    return
  }

  const cellButton = target.closest<HTMLButtonElement>('[data-action="sudoku-cell"]')
  if (cellButton) {
    state.selected = Number(cellButton.dataset.index)
    render()
    return
  }

  const digitButton = target.closest<HTMLButtonElement>('[data-action="sudoku-digit"]')
  if (digitButton) {
    if (state.selected !== null) writeValue(state.selected, Number(digitButton.dataset.digit))
    return
  }

  if (target.closest('[data-action="sudoku-erase"]')) {
    if (state.selected !== null) writeValue(state.selected, 0)
    return
  }

  if (target.closest('[data-action="hint"]')) {
    useHint()
    return
  }

  if (target.closest('[data-action="request-reset"]')) {
    state.pendingReset = true
    render()
    return
  }

  if (target.closest('[data-action="cancel-reset"]')) {
    state.pendingReset = false
    render()
    return
  }

  if (target.closest('[data-action="confirm-reset"]')) {
    confirmReset()
    return
  }

  if (target.closest('[data-action="next-sequential"]')) {
    void loadPuzzle('sequential')
    return
  }

  if (target.closest('[data-action="next-random"]')) {
    void loadPuzzle('fresh')
    return
  }

  if (target.closest('[data-action="close-modal"]')) {
    state.isCompleted = false
    render()
  }
}

function handleKeyDown(event: KeyboardEvent): void {
  if (!state.board || state.pendingReset) return

  const { key } = event

  if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
    event.preventDefault()
    moveSelection(
      key === 'ArrowUp' ? -1 : key === 'ArrowDown' ? 1 : 0,
      key === 'ArrowLeft' ? -1 : key === 'ArrowRight' ? 1 : 0
    )
    return
  }

  if (state.selected === null) return

  if (key === 'Backspace' || key === 'Delete' || key === '0') {
    event.preventDefault()
    writeValue(state.selected, 0)
    return
  }

  const digit = Number(key)

  if (Number.isInteger(digit) && digit >= 1 && digit <= state.board.geometry.size) {
    event.preventDefault()
    writeValue(state.selected, digit)
  }
}

// ---------- Render ----------

function renderTimerOnly(): void {
  const element = root?.querySelector('[data-timer]')
  if (element) element.textContent = formatTime(state.elapsedMs)
}

function render(justWonWithBest = false): void {
  if (!root) return

  root.innerHTML = `
    <div class="app-shell">
      ${renderGameHeader('sudoku')}
      ${renderMain()}
    </div>
    ${state.pendingReset ? renderResetConfirm() : ''}
    ${state.isCompleted ? renderCompletionModal(justWonWithBest) : ''}
    ${state.pausedByBlur ? renderPauseOverlay() : ''}
  `
}

function renderMain(): string {
  if (state.errorMessage) {
    return `<div class="state-message state-error">${state.errorMessage}</div>`
  }

  if (state.isLoading || !state.board) {
    return `<div class="state-message">Generando tablero…</div>`
  }

  const board = state.board

  const variantChips = SUDOKU_VARIANTS.map(
    (variant) => `
      <button
        type="button"
        class="size-chip ${variant === state.variant ? 'active' : ''}"
        data-action="sudoku-variant"
        data-variant="${variant}"
      >${VARIANT_LABELS[variant]}</button>
    `
  ).join('')

  const difficultyChips = SUDOKU_DIFFICULTIES.map(
    (difficulty) => `
      <button
        type="button"
        class="size-chip ${difficulty === state.difficulty ? 'active' : ''}"
        data-action="sudoku-difficulty"
        data-difficulty="${difficulty}"
      >${DIFFICULTY_LABELS[difficulty]}</button>
    `
  ).join('')

  return `
    <div class="game-area">
      <div class="game-area-header">
        <div class="timer" aria-label="Tiempo transcurrido">
          <span aria-hidden="true">#</span>
          <span class="timer-value" data-timer>${formatTime(state.elapsedMs)}</span>
        </div>
        <div class="puzzle-meta">
          <span>${renderPuzzleLabel()}</span>
          ${renderBestTime()}
        </div>
      </div>

      <nav class="size-selector" aria-label="Tipo de Sudoku">${variantChips}</nav>
      <nav class="size-selector" aria-label="Dificultad">${difficultyChips}</nav>

      <div class="board-frame">
        <div class="board-stage">
          ${renderSudokuBoard(board, {
            selected: state.selected,
            conflicts: state.conflicts,
            flashing: state.flashing,
            hinted: state.hinted,
          })}
        </div>
      </div>

      ${renderSudokuPad(board)}

      <div class="puzzle-nav">
        <button type="button" class="control-button control-button-primary" data-action="next-sequential">
          ▶ Siguiente
        </button>
        <button type="button" class="control-button control-button-accent" data-action="next-random">
          🔀 Aleatorio
        </button>
      </div>

      <div class="controls">
        <button type="button" class="control-button" data-action="request-reset">⟲ Reiniciar</button>
        <button type="button" class="control-button" data-action="hint">💡 Pista</button>
      </div>
    </div>
  `
}

function renderPuzzleLabel(): string {
  if (state.puzzleNumber === 0) return 'Puzzle aleatorio'

  return state.puzzleCount > 0
    ? `Puzzle ${state.puzzleNumber} de ${state.puzzleCount}`
    : `Puzzle ${state.puzzleNumber}`
}

function renderBestTime(): string {
  const best = readBestTime()

  if (best === null) return ''

  return `<span class="best-time">Mejor: ${formatTime(best)}</span>`
}

function renderResetConfirm(): string {
  return `
    <div class="modal-overlay" role="dialog" aria-modal="true">
      <div class="modal-card">
        <h2>¿Reiniciar este puzzle?</h2>
        <p>Se borrarán tus números y el tiempo volverá a cero.</p>
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
  return `
    <div class="modal-overlay" role="dialog" aria-modal="true">
      <div class="modal-card modal-card-celebration">
        <p class="eyebrow">¡Puzzle completado!</p>
        <h2>${VARIANT_LABELS[state.variant]} · ${DIFFICULTY_LABELS[state.difficulty]}</h2>

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
          <button type="button" class="control-button control-button-primary" data-action="next-sequential">
            ▶ Siguiente
          </button>
          <button type="button" class="control-button control-button-accent" data-action="next-random">
            🔀 Aleatorio
          </button>
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
