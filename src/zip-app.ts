/**
 * Pantalla de Zip: un solo trazo que une los números en orden y llena el
 * tablero. Tamaños 5×5 (niños), 6×6 y 7×7; el tamaño es la dificultad.
 *
 * Diseño: D:\Luzaron Games\design_handoff_zip (README + Zip Templates.html).
 * Decisiones: claude/zip-decisiones.md en el proyecto.
 *
 * Detalles de implementación:
 * - Mientras se arrastra **no** se repinta la pantalla completa: solo el SVG
 *   del tablero y el estado de los botones. El contenedor del tablero no se
 *   reemplaza, así la captura del puntero sigue viva todo el gesto.
 * - Entre dos eventos `pointermove` el dedo puede saltarse celdas; se
 *   interpola el recorrido en pasos de un cuarto de celda para no perderlas.
 * - Deshacer va por gesto (todo lo que cambió entre tocar y soltar), no por
 *   celda: deshacer un arrastre largo celda por celda sería eterno.
 */

import {
  canStart,
  createZipGame,
  hintFor,
  isZipSolved,
  tryStep,
  type StepBlock,
  type ZipGame,
} from './games/zip/zip-engine'
import {
  HOWTO_FILL_SVG,
  HOWTO_ORDER_SVG,
  renderZipBallLayer,
  renderZipBoardSvg,
  zipBallState,
  type ZipBoardView,
} from './games/zip/zip-board-renderer'
import { generateFreshZip, markZipSolved, pickSequentialZip } from './games/zip/zip-pool'
import {
  SIZE_LABELS,
  ZIP_SIZES,
  areAdjacent,
  neighborsOf,
  type ZipSize,
} from './games/zip/zip-types'
import { renderGameHeader } from './shell/app-header'
import { getBestTime, submitRecord } from './shell/records'
import { button, buttonRow, celebration, icon, pauseOverlay, segmented } from './shell/ui'

const SETTINGS_KEY = 'luzaron-zip-settings-v1'
const ERROR_MS = 1400
const SOLVED_MODAL_DELAY_MS = 450

interface ZipError {
  kind: 'wall' | 'order'
  wall: number | null
  cell: number | null
}

interface AppState {
  size: ZipSize
  game: ZipGame | null
  puzzleNumber: number
  puzzleCount: number
  path: number[]
  history: number[][]
  hintCell: number | null
  hintsUsed: number
  error: ZipError | null
  elapsedMs: number
  timerRunning: boolean
  timerStarted: boolean
  isWindowFocused: boolean
  pausedByBlur: boolean
  solved: boolean
  showModal: boolean
  newBest: boolean
  howToOpen: boolean | null
  isLoading: boolean
  errorMessage: string | null
}

const state: AppState = {
  size: 6,
  game: null,
  puzzleNumber: 0,
  puzzleCount: 0,
  path: [],
  history: [],
  hintCell: null,
  hintsUsed: 0,
  error: null,
  elapsedMs: 0,
  timerRunning: false,
  timerStarted: false,
  isWindowFocused: true,
  pausedByBlur: false,
  solved: false,
  showModal: false,
  newBest: false,
  howToOpen: null,
  isLoading: true,
  errorMessage: null,
}

let root: HTMLDivElement | null = null
let timerStartedAt = 0
let timerHandle: number | null = null
let errorHandle: number | null = null
let modalHandle: number | null = null
let loadToken = 0

/** Gesto en curso: de pointerdown a pointerup. */
interface Drag {
  pointerId: number
  before: number[]
  lastX: number
  lastY: number
  /** Última celda contra la que se chocó, para no repetir el aviso en cada move. */
  blockedCell: number | null
}

let drag: Drag | null = null

// ---------- Ciclo de vida ----------

export function mountZipApp(): void {
  const found = document.querySelector<HTMLDivElement>('#app')
  if (!found) throw new Error('No se encontró el elemento #app')

  root = found
  readSettings()
  state.isWindowFocused = document.hasFocus()

  root.addEventListener('click', handleClick)
  root.addEventListener('pointerdown', handlePointerDown)
  root.addEventListener('pointermove', handlePointerMove)
  root.addEventListener('pointerup', handlePointerEnd)
  root.addEventListener('pointercancel', handlePointerEnd)
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('blur', handleFocusChange)
  window.addEventListener('focus', handleFocusChange)
  document.addEventListener('visibilitychange', handleFocusChange)

  render()
  void loadPuzzle('sequential', false)
}

export function unmountZipApp(): void {
  root?.removeEventListener('click', handleClick)
  root?.removeEventListener('pointerdown', handlePointerDown)
  root?.removeEventListener('pointermove', handlePointerMove)
  root?.removeEventListener('pointerup', handlePointerEnd)
  root?.removeEventListener('pointercancel', handlePointerEnd)
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('blur', handleFocusChange)
  window.removeEventListener('focus', handleFocusChange)
  document.removeEventListener('visibilitychange', handleFocusChange)

  pauseTimer()
  clearTimers()
  drag = null

  if (root) root.innerHTML = ''
  root = null
}

function clearTimers(): void {
  if (errorHandle !== null) window.clearTimeout(errorHandle)
  if (modalHandle !== null) window.clearTimeout(modalHandle)
  errorHandle = null
  modalHandle = null
}

// ---------- Preferencias ----------

function readSettings(): void {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    if (!raw) return

    const parsed = JSON.parse(raw) as { size?: number; howToOpen?: boolean }
    if (ZIP_SIZES.includes(parsed.size as ZipSize)) state.size = parsed.size as ZipSize
    if (typeof parsed.howToOpen === 'boolean') state.howToOpen = parsed.howToOpen
  } catch {
    // Preferencias corruptas: se usan las de fábrica.
  }
}

function writeSettings(): void {
  try {
    const saved: { size: ZipSize; howToOpen?: boolean } = { size: state.size }
    if (state.howToOpen !== null) saved.howToOpen = state.howToOpen
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(saved))
  } catch {
    // Sin almacenamiento: las preferencias solo duran la sesión.
  }
}

/** Sin preferencia guardada, "Cómo se juega" va abierto en escritorio y plegado en teléfono. */
function isHowToOpen(): boolean {
  if (state.howToOpen !== null) return state.howToOpen
  return window.matchMedia('(min-width: 1024px)').matches
}

function packId(): string {
  return `zip-${state.size}x${state.size}`
}

// ---------- Carga ----------

type LoadMode = 'sequential' | 'next' | 'fresh'

async function loadPuzzle(mode: LoadMode, advance = true): Promise<void> {
  const token = ++loadToken
  state.isLoading = true
  state.errorMessage = null
  render()

  // Un tick para que "Generando tablero…" alcance a pintarse.
  await new Promise((resolve) => window.setTimeout(resolve, 0))

  try {
    const picked =
      mode === 'fresh'
        ? generateFreshZip(state.size)
        : await pickSequentialZip(state.size, mode === 'next' && advance)

    if (token !== loadToken) return

    state.game = createZipGame(picked.puzzle)
    state.puzzleNumber = picked.puzzleNumber
    state.puzzleCount = picked.puzzleCount
    state.path = []
    state.history = []
    state.hintCell = null
    state.hintsUsed = 0
    state.error = null
    state.solved = false
    state.showModal = false
    state.newBest = false
    state.isLoading = false
    clearTimers()
    resetTimer()
  } catch (error) {
    console.error(error)
    state.errorMessage = 'No se pudo preparar el tablero. Intenta de nuevo.'
    state.isLoading = false
  }

  render()
}

// ---------- Timer ----------

function startTimer(): void {
  if (state.timerRunning || state.solved) return

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
  if (state.timerRunning) state.elapsedMs = Date.now() - timerStartedAt
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
  return `${minutes}:${String(seconds).padStart(2, '0')}`
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
    if (!state.solved && state.game) startTimer()
  }

  render()
}

// ---------- Jugadas ----------

function setPath(next: number[]): void {
  state.path = next
  if (state.hintCell !== null && next.includes(state.hintCell)) state.hintCell = null
  if (!state.timerStarted && next.length > 0) startTimer()
}

function sameCells(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((cell, index) => cell === b[index])
}

function showError(kind: StepBlock, wall: number | undefined, cell: number): void {
  if (kind !== 'wall' && kind !== 'order') return

  state.error = {
    kind,
    wall: kind === 'wall' ? (wall ?? null) : null,
    cell: kind === 'order' ? cell : null,
  }

  if (errorHandle !== null) window.clearTimeout(errorHandle)
  errorHandle = window.setTimeout(() => {
    errorHandle = null
    state.error = null
    refreshBoard()
  }, ERROR_MS)
}

/**
 * El dedo entró a `cell`. Si es del trazo, se recorta hasta ahí (eso cubre
 * volver sobre la celda anterior); si es vecina de la punta, se intenta
 * avanzar; si es diagonal (se cruzó justo por una esquina), se prueba por
 * las dos celdas intermedias.
 */
function enterCell(cell: number): void {
  const game = state.game
  if (!game || state.solved) return

  const path = state.path
  const tip = path[path.length - 1]
  if (cell === tip) return

  const at = path.indexOf(cell)
  if (at !== -1) {
    setPath(path.slice(0, at + 1))
    if (drag) drag.blockedCell = null
    refreshBoard()
    return
  }

  if (tip === undefined) return

  const size = game.puzzle.size
  if (areAdjacent(size, tip, cell)) {
    step(cell)
    return
  }

  // Diagonal: tip y cell comparten dos vecinas.
  for (const middle of neighborsOf(size, tip)) {
    if (!areAdjacent(size, middle, cell)) continue
    if (!tryStep(game, path, middle).ok) continue
    if (!tryStep(game, [...path, middle], cell).ok) continue
    setPath([...path, middle, cell])
    afterStep()
    return
  }
}

function step(cell: number): void {
  const game = state.game
  if (!game) return

  const result = tryStep(game, state.path, cell)

  if (!result.ok) {
    if (drag?.blockedCell === cell) return
    if (drag) drag.blockedCell = cell
    showError(result.reason, result.wall, cell)
    refreshBoard()
    return
  }

  if (drag) drag.blockedCell = null
  setPath([...state.path, cell])
  afterStep()
}

function afterStep(): void {
  const game = state.game
  if (game && isZipSolved(game, state.path)) {
    completePuzzle()
    return
  }
  refreshBoard()
}

function completePuzzle(): void {
  state.solved = true
  state.error = null
  state.hintCell = null
  pauseTimer()
  drag = null

  state.newBest =
    state.hintsUsed === 0 &&
    submitRecord({
      gameId: 'zip',
      packId: packId(),
      levelId: String(state.puzzleNumber),
      rawTimeMs: state.elapsedMs,
      hintsUsed: state.hintsUsed,
    }).isNewBest

  markZipSolved(state.size, state.puzzleNumber, state.puzzleCount)
  render()

  // Primero se ve el trazo pasar al degradado de celebración, luego el modal.
  modalHandle = window.setTimeout(() => {
    modalHandle = null
    state.showModal = true
    render()
  }, SOLVED_MODAL_DELAY_MS)
}

function pushHistory(before: number[]): void {
  state.history.push(before)
  if (state.history.length > 200) state.history.shift()
}

function undo(): void {
  if (state.solved) return
  const previous = state.history.pop()
  if (!previous) return

  state.path = previous
  state.hintCell = null
  state.error = null
  refreshBoard()
}

function useHint(): void {
  const game = state.game
  if (!game || state.solved) return

  const hint = hintFor(game, state.path)
  if (!hint) return

  const before = state.path
  let next = state.path.slice(0, hint.keep)
  let cell = hint.cell

  // Sin trazo, la pista arranca en el 1 y marca la celda que le sigue.
  if (next.length === 0) {
    next = [game.puzzle.solution[0]]
    cell = game.puzzle.solution[1]
  }

  // Repetir la pista sin haber movido nada no cuesta otra.
  const repeated = state.hintCell === cell && sameCells(next, state.path)
  if (!repeated) {
    state.hintsUsed += 1
    if (!sameCells(before, next)) pushHistory(before)
  }

  setPath(next)
  state.hintCell = cell
  state.error = null
  refreshBoard()
}

// ---------- Puntero ----------

function boardElement(): HTMLElement | null {
  return root?.querySelector<HTMLElement>('[data-zip-board]') ?? null
}

function cellAt(board: HTMLElement, clientX: number, clientY: number): number | null {
  const game = state.game
  if (!game) return null

  const rect = board.getBoundingClientRect()
  const size = game.puzzle.size
  const column = Math.floor(((clientX - rect.left) / rect.width) * size)
  const row = Math.floor(((clientY - rect.top) / rect.height) * size)

  if (column < 0 || row < 0 || column >= size || row >= size) return null
  return row * size + column
}

function handlePointerDown(event: PointerEvent): void {
  const board = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-zip-board]')
  const game = state.game
  if (!board || !game || state.solved || event.button > 0) return

  const cell = cellAt(board, event.clientX, event.clientY)
  if (cell === null) return

  const before = state.path
  const inPath = state.path.indexOf(cell)
  const tip = state.path[state.path.length - 1]

  if (inPath !== -1) {
    // Tocar una celda del trazo lo recorta hasta ahí (tocar la punta no cambia nada).
    setPath(state.path.slice(0, inPath + 1))
  } else if (canStart(game, cell)) {
    setPath([cell])
  } else if (tip !== undefined && areAdjacent(game.puzzle.size, tip, cell)) {
    drag = {
      pointerId: event.pointerId,
      before,
      lastX: event.clientX,
      lastY: event.clientY,
      blockedCell: null,
    }
    step(cell)
    if (!drag) return
  } else {
    return
  }

  event.preventDefault()
  drag = drag ?? {
    pointerId: event.pointerId,
    before,
    lastX: event.clientX,
    lastY: event.clientY,
    blockedCell: null,
  }
  board.setPointerCapture?.(event.pointerId)
  refreshBoard()
}

function handlePointerMove(event: PointerEvent): void {
  if (!drag || event.pointerId !== drag.pointerId) return

  const board = boardElement()
  if (!board) return

  // Interpolación: pasos de un cuarto de celda entre el punto anterior y este.
  const rect = board.getBoundingClientRect()
  const cellPx = rect.width / (state.game?.puzzle.size ?? 6)
  const dx = event.clientX - drag.lastX
  const dy = event.clientY - drag.lastY
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (cellPx / 4)))

  for (let i = 1; i <= steps && drag; i += 1) {
    const cell = cellAt(board, drag.lastX + (dx * i) / steps, drag.lastY + (dy * i) / steps)
    if (cell !== null) enterCell(cell)
  }

  if (drag) {
    drag.lastX = event.clientX
    drag.lastY = event.clientY
  }
}

function handlePointerEnd(event: PointerEvent): void {
  if (!drag || event.pointerId !== drag.pointerId) {
    // El gesto que resolvió el puzzle ya soltó `drag`; nada más que hacer.
    return
  }

  const before = drag.before
  drag = null
  if (!sameCells(before, state.path)) pushHistory(before)
  updateControls()
}

// ---------- Teclado ----------

function handleKeyDown(event: KeyboardEvent): void {
  const game = state.game
  if (!game || state.showModal) return

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    undo()
    return
  }

  const deltas: Record<string, [number, number]> = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
  }
  const delta = deltas[event.key]
  if (!delta || state.solved) return

  event.preventDefault()
  const size = game.puzzle.size
  const before = state.path

  if (state.path.length === 0) {
    setPath([game.puzzle.numbers[0]])
    pushHistory(before)
    refreshBoard()
    return
  }

  const tip = state.path[state.path.length - 1]
  const row = Math.floor(tip / size) + delta[0]
  const column = (tip % size) + delta[1]
  if (row < 0 || column < 0 || row >= size || column >= size) return

  enterCell(row * size + column)
  if (!sameCells(before, state.path)) pushHistory(before)
  updateControls()
}

// ---------- Clics ----------

function handleClick(event: MouseEvent): void {
  const target = event.target as HTMLElement | null
  if (!target) return

  const sizeButton = target.closest<HTMLButtonElement>('[data-action="zip-size"]')
  if (sizeButton) {
    const size = Number(sizeButton.dataset.size) as ZipSize
    if (size !== state.size) {
      state.size = size
      writeSettings()
      void loadPuzzle('sequential', false)
    }
    return
  }

  if (target.closest('[data-action="undo"]')) return undo()
  if (target.closest('[data-action="hint"]')) return useHint()

  if (target.closest('[data-action="zip-howto"]')) {
    state.howToOpen = !isHowToOpen()
    writeSettings()
    render()
    return
  }

  if (target.closest('[data-action="show-results"]')) {
    state.showModal = true
    render()
    return
  }

  if (target.closest('[data-action="close-modal"]')) {
    state.showModal = false
    render()
    return
  }

  if (target.closest('[data-action="next-sequential"]')) {
    // Al resolver, el cursor ya pasó al siguiente; si se salta sin resolver, se avanza aquí.
    void loadPuzzle('next', !state.solved && state.puzzleNumber > 0)
    return
  }

  if (target.closest('[data-action="next-random"]')) {
    void loadPuzzle('fresh')
    return
  }

  // Tocar fuera de la tarjeta también cierra el modal; "Ver resultados" lo vuelve a abrir.
  if (state.showModal && target.classList.contains('modal-overlay')) {
    state.showModal = false
    render()
  }
}

// ---------- Render ----------

function renderTimerOnly(): void {
  const element = root?.querySelector('[data-timer]')
  if (element) element.textContent = formatTime(state.elapsedMs)
}

/** Repinta solo lo que cambia al jugar: el tablero, el aviso y los botones. */
function refreshBoard(): void {
  const board = boardElement()
  if (!board || !state.game) {
    render()
    return
  }

  const svg = board.querySelector('[data-zip-svg]')
  if (svg) svg.innerHTML = boardSvg()
  moveBall(board)

  const toast = board.querySelector('[data-zip-toast]')
  if (toast) toast.outerHTML = renderToast()

  board.classList.toggle('has-error', state.error !== null)
  updateControls()
}

function updateControls(): void {
  const undoButton = root?.querySelector<HTMLButtonElement>('[data-action="undo"]')
  if (undoButton) undoButton.disabled = state.solved || state.history.length === 0

  const hintButton = root?.querySelector<HTMLButtonElement>('[data-action="hint"]')
  if (hintButton) {
    hintButton.disabled = state.solved
    const label = hintButton.querySelector('.control-button-label')
    if (label) label.textContent = hintLabel()
  }
}

function hintLabel(): string {
  return state.hintsUsed > 0 ? `Pista · ${state.hintsUsed}` : 'Pista'
}

function boardView(): ZipBoardView {
  return {
    path: state.path,
    hintCell: state.hintCell,
    solved: state.solved,
    errorWall: state.error?.kind === 'wall' ? state.error.wall : null,
    errorNumber: state.error?.kind === 'order' ? state.error.cell : null,
    tipError: state.error !== null,
  }
}

function boardSvg(): string {
  const game = state.game
  if (!game) return ''
  return renderZipBoardSvg(game.puzzle, boardView())
}

function ballLayer(): string {
  const game = state.game
  if (!game) return ''
  return renderZipBallLayer(game.puzzle, boardView())
}

/**
 * El balón no se repinta: se mueve. Al cambiar su `transform` la transición
 * CSS de 90 ms lo desliza a la celda nueva. Cuando reaparece (trazo nuevo o
 * después de vaciarlo) se coloca sin transición, para que no llegue volando
 * desde la esquina.
 */
function moveBall(board: HTMLElement): void {
  const game = state.game
  const ball = board.querySelector<SVGGElement>('[data-zip-ball]')
  if (!game || !ball) return

  const next = zipBallState(game.puzzle, boardView())
  const wasHidden = ball.classList.contains('is-hidden')

  if (wasHidden && next.visible) {
    ball.classList.add('no-slide')
    ball.style.transform = next.transform
    void ball.getBoundingClientRect()
    ball.classList.remove('no-slide')
  } else {
    ball.style.transform = next.transform
  }

  ball.classList.toggle('is-hidden', !next.visible)
  ball.classList.toggle('is-error', next.error)
}

function renderToast(): string {
  if (!state.error) return '<div class="zip-toast" data-zip-toast hidden></div>'

  const text = state.error.kind === 'wall' ? 'Hay un muro en el camino' : 'Ese número va después'
  return `<div class="zip-toast" data-zip-toast role="status">${text}</div>`
}

function render(): void {
  if (!root) return

  root.innerHTML = `
    <div class="app-shell zip-shell">
      ${renderGameHeader('zip')}
      ${renderMain()}
    </div>
    ${state.showModal ? renderCompletionModal() : ''}
    ${state.pausedByBlur ? renderPauseOverlay() : ''}
  `
}

function renderPuzzleLabel(): string {
  if (state.puzzleNumber === 0) return 'Aleatorio'
  return `#${state.puzzleNumber} de ${state.puzzleCount}`
}

function renderStatus(): string {
  if (state.solved) {
    return `<span class="solved-label">${icon('check')}Resuelto · ${formatTime(state.elapsedMs)}</span>`
  }
  return `<span class="timer" data-timer aria-label="Tiempo">${formatTime(state.elapsedMs)}</span>`
}

function renderBestLine(): string {
  const best = getBestTime('zip', packId())
  return best !== null ? `<span class="best-time">Mejor: ${formatTime(best)}</span>` : ''
}

function renderMain(): string {
  if (state.errorMessage) {
    return `<div class="state-message state-error">${state.errorMessage}</div>`
  }

  const chips = ZIP_SIZES.map((size) => ({
    label: SIZE_LABELS[size],
    active: size === state.size,
    attrs: `data-size="${size}"`,
  }))
  const chipNav = segmented('Tamaño del tablero', 'zip-size', chips, 'zip-chips')

  if (state.isLoading || !state.game) {
    return `
      <div class="zip-layout">
        ${chipNav}
        <div class="state-message">Generando tablero…</div>
      </div>
    `
  }

  const open = isHowToOpen()
  const disabled = state.solved ? 'disabled' : ''

  return `
    <div class="zip-layout ${state.size === 5 ? 'is-kids' : ''}">
      <div class="zip-board-col">
        <div class="zip-board ${state.solved ? 'is-solved' : ''} ${state.error ? 'has-error' : ''}"
             data-zip-board>
          <div class="zip-board-svg" data-zip-svg>${boardSvg()}</div>
          ${ballLayer()}
          ${renderToast()}
        </div>
      </div>

      <aside class="zip-side">
        <div class="zip-card">
          <span class="zip-card-title">Zip</span>
          <div class="game-status zip-meta">
            ${renderStatus()}
            <div class="puzzle-meta">
              <span>${renderPuzzleLabel()}</span>
              ${renderBestLine()}
            </div>
          </div>

          ${chipNav}

          ${buttonRow(
            [
              button({
                action: 'undo',
                label: 'Deshacer',
                icon: 'undo-2',
                disabled: state.solved || state.history.length === 0,
              }),
              button({
                action: 'hint',
                label: hintLabel(),
                icon: 'lightbulb',
                disabled: !!disabled,
              }),
            ],
            'zip-controls'
          )}

          ${
            state.solved
              ? button({
                  action: 'show-results',
                  label: 'Ver resultados',
                  icon: 'trophy',
                  variant: 'primary',
                  className: 'zip-results',
                })
              : ''
          }
        </div>

        <section class="zip-howto ${open ? 'is-open' : ''}">
          <button type="button" class="zip-howto-head" data-action="zip-howto" aria-expanded="${open}">
            <span>Cómo se juega</span>
            <span class="zip-howto-chevron" aria-hidden="true">${icon('chevron-down')}</span>
          </button>
          ${
            open
              ? `<div class="zip-howto-body">
                   <figure>${HOWTO_ORDER_SVG}<figcaption>Conecta los puntos en orden</figcaption></figure>
                   <figure>${HOWTO_FILL_SVG}<figcaption>Pasa por cada celda</figcaption></figure>
                 </div>`
              : ''
          }
        </section>
      </aside>
    </div>
  `
}

function renderCompletionModal(): string {
  const best = getBestTime('zip', packId())
  const label = state.puzzleNumber > 0 ? `Zip #${state.puzzleNumber}` : 'Zip aleatorio'

  return celebration({
    eyebrow: `${label} · ${SIZE_LABELS[state.size]}`,
    title: '¡Resuelto!',
    titleId: 'zip-modal-title',
    className: 'zip-modal',
    stats: [
      { label: 'Tiempo', value: formatTime(state.elapsedMs), trophy: state.newBest },
      { label: 'Mejor', value: best !== null ? formatTime(best) : '—' },
      { label: 'Pistas', value: String(state.hintsUsed) },
    ],
    note: state.newBest ? `Nuevo mejor tiempo en ${SIZE_LABELS[state.size]}` : undefined,
    primary: { action: 'next-sequential', label: 'Siguiente', icon: 'play' },
    secondary: [
      { action: 'next-random', label: 'Aleatorio', icon: 'shuffle' },
      { action: 'close-modal', label: 'Cerrar' },
    ],
  })
}

function renderPauseOverlay(): string {
  return pauseOverlay()
}
