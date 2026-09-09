/**
 * Pantalla de Mahjong Solitario: tres tableros, reparto con solución
 * garantizada, deshacer, barajar y pista.
 *
 * Reglas visuales acordadas:
 * - Fichas tradicionales con grosor falso; el sprite vive en
 *   public/art/mahjong/mahjong-tiles.svg y se inyecta una sola vez.
 * - Flores y estaciones emparejan por familia, no por dibujo (matchKey).
 * - Nunca se reparte una partida imposible: el generador construye el
 *   tablero al revés de una solución válida.
 * - El récord solo se guarda si la partida se ganó sin pista, sin barajar y
 *   sin deshacer.
 */

import {
  countAvailablePairs,
  findAvailablePair,
  isFree,
  listAvailablePairs,
  isSolved,
  removePair,
  undoLastPair,
} from './games/mahjong/mahjong-engine'
import { dealMahjongBoard, reshuffleRemaining } from './games/mahjong/mahjong-generator'
import { measureBoard, renderMahjongBoard } from './games/mahjong/mahjong-board-renderer'
import { loadMahjongSprite } from './games/mahjong/mahjong-sprite'
import {
  LAYOUT_HINTS,
  LAYOUT_LABELS,
  MAHJONG_LAYOUT_IDS,
  remainingTiles,
  type MahjongBoardState,
  type MahjongLayoutId,
} from './games/mahjong/mahjong-types'
import { renderGameHeader } from './shell/app-header'
import { getBestTime, submitRecord } from './shell/records'

const SETTINGS_KEY = 'luzaron-mahjong-settings-v1'
const MATCH_MS = 240
const INVALID_MS = 320

interface AppState {
  layoutId: MahjongLayoutId
  board: MahjongBoardState | null
  selected: number | null
  hovered: number | null
  hinted: Set<number>
  matched: Set<number>
  invalid: Set<number>
  highlightFree: boolean
  expanded: boolean
  lastHint: [number, number] | null
  hintsUsed: number
  shufflesUsed: number
  undosUsed: number
  elapsedMs: number
  timerRunning: boolean
  timerStarted: boolean
  isWindowFocused: boolean
  pausedByBlur: boolean
  isCompleted: boolean
  isStuck: boolean
  isLoading: boolean
  errorMessage: string | null
  pendingReset: boolean
}

const state: AppState = {
  layoutId: 'tortuga',
  board: null,
  selected: null,
  hovered: null,
  hinted: new Set(),
  matched: new Set(),
  invalid: new Set(),
  highlightFree: false,
  expanded: false,
  lastHint: null,
  hintsUsed: 0,
  shufflesUsed: 0,
  undosUsed: 0,
  elapsedMs: 0,
  timerRunning: false,
  timerStarted: false,
  isWindowFocused: true,
  pausedByBlur: false,
  isCompleted: false,
  isStuck: false,
  isLoading: true,
  errorMessage: null,
  pendingReset: false,
}

let root: HTMLDivElement | null = null
let timerStartedAt = 0
let timerHandle: number | null = null
let matchHandle: number | null = null
let invalidHandle: number | null = null

// ---------- Ciclo de vida ----------

export function mountMahjongApp(): void {
  const found = document.querySelector<HTMLDivElement>('#app')

  if (!found) throw new Error('No se encontró el elemento #app')

  root = found
  readSettings()

  state.isWindowFocused = document.hasFocus()

  root.addEventListener('click', handleClick)
  root.addEventListener('pointerover', handlePointer)
  root.addEventListener('pointerdown', handlePointer)
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('blur', handleFocusChange)
  window.addEventListener('focus', handleFocusChange)
  window.addEventListener('resize', fitBoard)
  document.addEventListener('visibilitychange', handleFocusChange)

  render()
  void startNewGame()
}

export function unmountMahjongApp(): void {
  root?.removeEventListener('click', handleClick)
  root?.removeEventListener('pointerover', handlePointer)
  root?.removeEventListener('pointerdown', handlePointer)
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('blur', handleFocusChange)
  window.removeEventListener('focus', handleFocusChange)
  window.removeEventListener('resize', fitBoard)
  document.removeEventListener('visibilitychange', handleFocusChange)

  pauseTimer()
  clearPendingTimeouts()

  state.expanded = false
  document.body.classList.remove('mahjong-expanded')

  if (root) root.innerHTML = ''
  root = null
}

function clearPendingTimeouts(): void {
  if (matchHandle !== null) {
    window.clearTimeout(matchHandle)
    matchHandle = null
  }

  if (invalidHandle !== null) {
    window.clearTimeout(invalidHandle)
    invalidHandle = null
  }
}

// ---------- Preferencias ----------

function readSettings(): void {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    if (!raw) return

    const parsed = JSON.parse(raw) as Partial<Pick<AppState, 'layoutId' | 'highlightFree'>>

    if (parsed.layoutId && MAHJONG_LAYOUT_IDS.includes(parsed.layoutId))
      state.layoutId = parsed.layoutId
    if (typeof parsed.highlightFree === 'boolean') state.highlightFree = parsed.highlightFree
  } catch {
    // Sin almacenamiento: se juega con las preferencias por defecto.
  }
}

function writeSettings(): void {
  try {
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ layoutId: state.layoutId, highlightFree: state.highlightFree })
    )
  } catch {
    // Sin almacenamiento: no se recuerdan las preferencias.
  }
}

/**
 * Los mejores tiempos los lleva `shell/records.ts`. La categoria es el layout.
 * Una partida solo cuenta como record si fue limpia: sin pista, sin barajar y
 * sin deshacer; por eso las tres ayudas suman a `hintsUsed` al reportarla.
 */
function packId(): string {
  return `mahjong-${state.layoutId}`
}

function readBestTime(): number | null {
  return getBestTime('mahjong', packId())
}

function maybeSaveBestTime(ms: number): boolean {
  return submitRecord({
    gameId: 'mahjong',
    packId: packId(),
    levelId: state.layoutId,
    rawTimeMs: ms,
    hintsUsed: state.hintsUsed + state.shufflesUsed + state.undosUsed,
  }).isNewBest
}

// ---------- Timer ----------

function startTimer(): void {
  if (state.timerRunning || state.isCompleted) return

  state.timerRunning = true
  state.timerStarted = true
  timerStartedAt = performance.now()

  timerHandle = window.setInterval(() => {
    state.elapsedMs += performance.now() - timerStartedAt
    timerStartedAt = performance.now()
    renderTimerOnly()
  }, 250)
}

function pauseTimer(): void {
  if (!state.timerRunning) return

  state.elapsedMs += performance.now() - timerStartedAt
  state.timerRunning = false

  if (timerHandle !== null) {
    window.clearInterval(timerHandle)
    timerHandle = null
  }
}

function resetTimer(): void {
  pauseTimer()
  state.elapsedMs = 0
  state.timerStarted = false
}

function handleFocusChange(): void {
  const focused = document.hasFocus() && document.visibilityState === 'visible'

  if (focused === state.isWindowFocused) return

  state.isWindowFocused = focused

  if (!focused && state.timerRunning) {
    pauseTimer()
    state.pausedByBlur = true
    render()
    return
  }

  if (focused && state.pausedByBlur) {
    state.pausedByBlur = false

    if (state.timerStarted && !state.isCompleted) startTimer()

    render()
  }
}

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

// ---------- Partida ----------

async function startNewGame(): Promise<void> {
  state.isLoading = true
  state.errorMessage = null
  clearPendingTimeouts()
  render()

  try {
    await loadMahjongSprite()
  } catch {
    state.isLoading = false
    state.errorMessage = 'No se pudieron cargar las fichas. Revisa la conexión y vuelve a entrar.'
    render()
    return
  }

  const { board } = dealMahjongBoard(state.layoutId)

  state.board = board
  state.selected = null
  state.hovered = null
  state.hinted = new Set()
  state.matched = new Set()
  state.invalid = new Set()
  state.lastHint = null
  state.hintsUsed = 0
  state.shufflesUsed = 0
  state.undosUsed = 0
  state.isCompleted = false
  state.isStuck = false
  state.isLoading = false

  resetTimer()
  render()
}

function selectTile(index: number): void {
  const board = state.board

  if (!board || state.isCompleted || state.pendingReset || state.isStuck) return

  const tile = board.tiles[index]

  if (!tile || tile.removed) return

  if (!isFree(board, tile)) {
    flashInvalid([index])
    return
  }

  state.hinted = new Set()

  if (state.selected === index) {
    state.selected = null
    render()
    return
  }

  const previous = state.selected === null ? null : board.tiles[state.selected]

  if (!previous || previous.removed || !isFree(board, previous)) {
    state.selected = index
    render()
    return
  }

  if (previous.face.matchKey !== tile.face.matchKey) {
    state.selected = index
    flashInvalid([previous.index, index])
    return
  }

  playPair(previous.index, index)
}

function playPair(first: number, second: number): void {
  const board = state.board

  if (!board) return

  if (!state.timerStarted) startTimer()

  removePair(board, first, second)

  state.selected = null
  state.hinted = new Set()
  state.matched = new Set([first, second])

  render()

  if (matchHandle !== null) window.clearTimeout(matchHandle)

  matchHandle = window.setTimeout(() => {
    matchHandle = null
    state.matched = new Set()
    if (isSolved(board)) {
      completeGame()
      return
    }

    if (findAvailablePair(board) === null) {
      state.isStuck = true
      pauseTimer()
    }

    render()
  }, MATCH_MS)
}

function flashInvalid(indexes: number[]): void {
  state.invalid = new Set(indexes)
  render()

  if (invalidHandle !== null) window.clearTimeout(invalidHandle)

  invalidHandle = window.setTimeout(() => {
    invalidHandle = null
    state.invalid = new Set()
    render()
  }, INVALID_MS)
}

function completeGame(): void {
  state.isCompleted = true
  state.selected = null
  state.matched = new Set()
  state.hinted = new Set()
  pauseTimer()

  const isNewBest = maybeSaveBestTime(state.elapsedMs)

  render(isNewBest)
}

function useHint(): void {
  const board = state.board

  if (!board || state.isCompleted || state.isStuck) return

  const pairs = listAvailablePairs(board)

  if (pairs.length === 0) {
    state.isStuck = true
    pauseTimer()
    render()
    return
  }

  if (!state.timerStarted) startTimer()

  // La pista se queda en la misma pareja mientras siga en el tablero: solo
  // cambia cuando el jugador la quita y vuelve a pedir pista.
  const previous = state.lastHint
  const kept =
    previous === null
      ? undefined
      : pairs.find(
          (candidate) =>
            (candidate[0].index === previous[0] && candidate[1].index === previous[1]) ||
            (candidate[0].index === previous[1] && candidate[1].index === previous[0])
        )
  const pair = kept ?? pairs[0]

  // Solo cuenta como pista nueva cuando revela una pareja distinta.
  if (!kept) state.hintsUsed += 1

  state.lastHint = [pair[0].index, pair[1].index]
  state.selected = null
  state.hinted = new Set([pair[0].index, pair[1].index])

  render()
}

function undoMove(): void {
  const board = state.board

  if (!board || state.isCompleted) return

  const undone = undoLastPair(board)

  if (!undone) return

  state.undosUsed += 1
  state.selected = null
  state.hinted = new Set()
  state.matched = new Set()
  state.isStuck = false

  if (state.timerStarted && !state.timerRunning && !state.pausedByBlur) startTimer()

  render()
}

function shuffleBoard(): void {
  const board = state.board

  if (!board || state.isCompleted) return

  const ok = reshuffleRemaining(board)

  state.lastHint = null
  state.shufflesUsed += 1
  state.selected = null
  state.hinted = new Set()
  state.matched = new Set()
  state.isStuck = !ok && findAvailablePair(board) === null

  if (!state.isStuck && state.timerStarted && !state.timerRunning && !state.pausedByBlur)
    startTimer()

  render()
}

// ---------- Eventos ----------

function handleClick(event: MouseEvent): void {
  const target = event.target as HTMLElement | null
  if (!target) return

  const layoutButton = target.closest<HTMLButtonElement>('[data-action="mahjong-layout"]')
  if (layoutButton) {
    const layoutId = layoutButton.dataset.layout as MahjongLayoutId

    if (layoutId !== state.layoutId) {
      state.layoutId = layoutId
      writeSettings()
      void startNewGame()
    }
    return
  }

  const tileButton = target.closest<HTMLButtonElement>('[data-action="mahjong-tile"]')
  if (tileButton) {
    selectTile(Number(tileButton.dataset.index))
    return
  }

  if (target.closest('[data-action="mahjong-expand"]')) {
    setExpanded(!state.expanded)
    return
  }

  if (target.closest('[data-action="mahjong-free"]')) {
    state.highlightFree = !state.highlightFree
    writeSettings()
    render()
    return
  }

  if (target.closest('[data-action="hint"]')) {
    useHint()
    return
  }

  if (target.closest('[data-action="mahjong-undo"]')) {
    undoMove()
    return
  }

  if (target.closest('[data-action="mahjong-shuffle"]')) {
    shuffleBoard()
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
    state.pendingReset = false
    void startNewGame()
    return
  }

  if (target.closest('[data-action="close-modal"]')) {
    state.isCompleted = false
    state.isStuck = false
    render()
  }
}

/**
 * Nombre de la ficha bajo el puntero. Con el dedo no hay "encima", así que
 * vale el último toque; si no hay ninguno, se cae a la ficha seleccionada.
 */
function handlePointer(event: PointerEvent): void {
  const target = event.target as HTMLElement | null
  const button = target?.closest<HTMLButtonElement>('[data-action="mahjong-tile"]')
  const next = button ? Number(button.dataset.index) : null

  if (next === state.hovered) return

  state.hovered = next
  refreshTileLabel()
}

function tileLabelText(): string {
  const board = state.board
  const index = state.hovered ?? state.selected

  if (!board || index === null) return 'Ficha: —'

  const tile = board.tiles[index]

  if (!tile || tile.removed) return 'Ficha: —'

  return `Ficha: ${tile.face.name}${isFree(board, tile) ? '' : ' · bloqueada'}`
}

/** Se actualiza sola, sin repintar el tablero entero en cada movimiento. */
function refreshTileLabel(): void {
  const element = root?.querySelector('[data-tile-label]')

  if (element) element.textContent = tileLabelText()
}

function handleKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && state.expanded) {
    event.preventDefault()
    setExpanded(false)
    return
  }

  if (event.key === 'Escape' && state.selected !== null) {
    event.preventDefault()
    state.selected = null
    render()
  }
}

/**
 * Expandir no es pantalla completa del sistema: el tablero pasa a ocupar toda
 * el área de navegación del navegador, con su propia barra de acciones dentro.
 */
function setExpanded(next: boolean): void {
  state.expanded = next
  state.selected = null

  document.body.classList.toggle('mahjong-expanded', next)

  render()
}

// ---------- Render ----------

function renderTimerOnly(): void {
  const label = formatTime(state.elapsedMs)

  root?.querySelectorAll('[data-timer]').forEach((element) => {
    element.textContent = label
  })
}

/** Escala el lienzo del tablero para que quepa en el hueco disponible. */
function fitBoard(): void {
  const board = state.board
  const stage = root?.querySelector<HTMLDivElement>('[data-stage]')
  const canvas = root?.querySelector<HTMLDivElement>('[data-canvas]')

  if (!board || !stage || !canvas) return

  const metrics = measureBoard(board)
  const available = stage.getBoundingClientRect()

  if (available.width === 0 || available.height === 0) return

  const maxScale = state.expanded ? 3 : 1.6
  const scale = Math.min(
    available.width / metrics.width,
    available.height / metrics.height,
    maxScale
  )

  canvas.style.transform = `translate(-50%, -50%) scale(${scale})`
}

function render(justWonWithBest = false): void {
  if (!root) return

  root.innerHTML = `
    <div class="app-shell">
      ${renderGameHeader('mahjong')}
      ${renderMain()}
    </div>
    ${state.pendingReset ? renderResetConfirm() : ''}
    ${state.isStuck && !state.isCompleted ? renderStuckModal() : ''}
    ${state.isCompleted ? renderCompletionModal(justWonWithBest) : ''}
    ${state.pausedByBlur ? renderPauseOverlay() : ''}
  `

  fitBoard()
}

function renderMain(): string {
  if (state.errorMessage) {
    return `<div class="state-message state-error">${state.errorMessage}</div>`
  }

  if (state.isLoading || !state.board) {
    return `<div class="state-message">Repartiendo fichas…</div>`
  }

  const board = state.board
  const left = remainingTiles(board)
  const pairs = countAvailablePairs(board)

  const layoutChips = MAHJONG_LAYOUT_IDS.map(
    (layoutId) => `
      <button
        type="button"
        class="size-chip ${layoutId === state.layoutId ? 'active' : ''}"
        data-action="mahjong-layout"
        data-layout="${layoutId}"
        title="${LAYOUT_HINTS[layoutId]}"
      >${LAYOUT_LABELS[layoutId]}</button>
    `
  ).join('')

  return `
    <div class="game-area">
      <div class="game-area-header">
        <div class="timer" aria-label="Tiempo transcurrido">
          <span aria-hidden="true">🀄</span>
          <span class="timer-value" data-timer>${formatTime(state.elapsedMs)}</span>
        </div>
        <div class="puzzle-meta">
          <span>${left} fichas · ${pairs} ${pairs === 1 ? 'pareja' : 'parejas'} a la vista</span>
          ${renderBestTime()}
        </div>
      </div>

      <nav class="size-selector" aria-label="Tablero">${layoutChips}</nav>

      <div class="board-frame mahjong-frame ${state.expanded ? 'is-expanded' : ''}">
        ${renderBoardBar(left, pairs, board.history.length > 0)}
        ${renderMahjongBoard(board, {
          selected: state.selected,
          hinted: state.hinted,
          matched: state.matched,
          invalid: state.invalid,
          highlightFree: state.highlightFree,
        })}
        <span class="mahjong-readout" data-tile-label>${tileLabelText()}</span>
      </div>

      <div class="puzzle-nav">
        <button type="button" class="control-button control-button-primary" data-action="request-reset">
          🔀 Nueva partida
        </button>
        <button
          type="button"
          class="control-button mahjong-toggle ${state.highlightFree ? 'active' : ''}"
          data-action="mahjong-free"
          aria-pressed="${state.highlightFree}"
        >👁 Resaltar libres</button>
      </div>

      <div class="controls">
        <button
          type="button"
          class="control-button"
          data-action="mahjong-undo"
          ${board.history.length === 0 ? 'disabled' : ''}
        >↶ Deshacer</button>
        <button type="button" class="control-button" data-action="mahjong-shuffle">🔁 Barajar</button>
        <button type="button" class="control-button" data-action="hint">💡 Pista</button>
      </div>
    </div>
  `
}

/**
 * Barra del tablero. Sin expandir es solo el botón de la esquina; expandido
 * baja también el reloj y las acciones, porque los controles de abajo quedan
 * fuera de la vista.
 */
function renderBoardBar(left: number, pairs: number, canUndo: boolean): string {
  const label = state.expanded ? 'Contraer el tablero' : 'Expandir el tablero'

  const tools = state.expanded
    ? `
      <div class="mahjong-board-info">
        <span class="mahjong-board-time" data-timer>${formatTime(state.elapsedMs)}</span>
        <span>${left} fichas · ${pairs} ${pairs === 1 ? 'pareja' : 'parejas'}</span>
      </div>
      <div class="mahjong-board-tools">
        <button type="button" class="mahjong-tool" data-action="hint">💡 Pista</button>
        <button
          type="button"
          class="mahjong-tool"
          data-action="mahjong-undo"
          ${canUndo ? '' : 'disabled'}
        >↶ Deshacer</button>
        <button type="button" class="mahjong-tool" data-action="mahjong-shuffle">🔁 Barajar</button>
        <button
          type="button"
          class="mahjong-tool ${state.highlightFree ? 'active' : ''}"
          data-action="mahjong-free"
          aria-pressed="${state.highlightFree}"
        >👁 Libres</button>
      </div>
    `
    : ''

  return `
    <div class="mahjong-board-bar">
      ${tools}
      <button
        type="button"
        class="mahjong-expand"
        data-action="mahjong-expand"
        aria-pressed="${state.expanded}"
        aria-label="${label}"
        title="${label}"
      >${state.expanded ? '⤡' : '⤢'}</button>
    </div>
  `
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
        <h2>¿Empezar una partida nueva?</h2>
        <p>Se reparten las fichas otra vez y el tiempo vuelve a cero.</p>
        <div class="modal-actions">
          <button type="button" class="control-button" data-action="cancel-reset">Cancelar</button>
          <button type="button" class="control-button control-button-primary" data-action="confirm-reset">
            Sí, repartir
          </button>
        </div>
      </div>
    </div>
  `
}

function renderStuckModal(): string {
  return `
    <div class="modal-overlay" role="dialog" aria-modal="true">
      <div class="modal-card">
        <p class="eyebrow">Sin movimientos</p>
        <h2>No quedan parejas a la vista</h2>
        <p>Puedes barajar las fichas que siguen en el tablero, deshacer tu última jugada o empezar de nuevo.</p>
        <div class="modal-actions">
          <button type="button" class="control-button" data-action="mahjong-undo">↶ Deshacer</button>
          <button type="button" class="control-button control-button-accent" data-action="mahjong-shuffle">
            🔁 Barajar
          </button>
          <button type="button" class="control-button control-button-primary" data-action="confirm-reset">
            🔀 Nueva partida
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
        <p class="eyebrow">¡Tablero limpio!</p>
        <h2>${LAYOUT_LABELS[state.layoutId]}</h2>

        <dl class="modal-stats">
          <div>
            <dt>Tiempo</dt>
            <dd>${formatTime(state.elapsedMs)}${justWonWithBest ? ' 🏆' : ''}</dd>
          </div>
          <div>
            <dt>Pistas</dt>
            <dd>${state.hintsUsed}</dd>
          </div>
          <div>
            <dt>Barajadas</dt>
            <dd>${state.shufflesUsed}</dd>
          </div>
        </dl>

        <div class="modal-actions">
          <button type="button" class="control-button" data-action="close-modal">Cerrar</button>
          <button type="button" class="control-button control-button-primary" data-action="confirm-reset">
            🔀 Otra partida
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
