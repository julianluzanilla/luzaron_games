/**
 * Pantalla de Memoria: voltea dos cartas y encuentra los pares.
 *
 * Diseño: D:\Luzaron Games\design_handoff_memoria (README + Memoria.html).
 * Decisiones: claude/memoria-decisiones.md en el proyecto.
 *
 * Detalles de implementación:
 * - Al jugar **no** se repinta la pantalla: cada carta cambia de clases en su
 *   propio nodo, así la transición de `rotateY` corre y se ve el volteo.
 * - Un par fallido se queda boca arriba 1 s (contado desde que termina de
 *   voltearse la segunda carta) y luego ambas vuelven boca abajo, también
 *   animadas. Mientras tanto se ignoran los toques.
 * - El tamaño de carta se calcula con el espacio real que queda debajo de los
 *   controles (ResizeObserver), así el tablero nunca hace scroll.
 */

import {
  MEMORIA_SIZES,
  createMemoriaGame,
  flipCard,
  getMemoriaSize,
  isMemoriaComplete,
  isMemoriaSizeId,
  memoriaPackId,
  openIsMatch,
  resolveOpen,
  type MemoriaGame,
  type MemoriaSizeId,
} from './games/memoria/memoria-engine'
import {
  cardSize,
  cardView,
  loadMemoriaGlyphs,
  renderMemoriaCard,
  updateMemoriaCard,
} from './games/memoria/memoria-board-renderer'
import { renderGameHeader } from './shell/app-header'
import { getBestTime, submitRecord } from './shell/records'
import { button, celebration, formatClock, icon, pauseOverlay, segmented } from './shell/ui'

const SETTINGS_KEY = 'luzaron-memoria-settings-v1'
/** Duración del volteo (igual que la transición del CSS). */
const FLIP_MS = 220
/** Cuánto se quedan boca arriba dos cartas que no son par. */
const MISMATCH_MS = 1000
const SOLVED_MODAL_DELAY_MS = 600
const CARD_GAP = 6

interface AppState {
  sizeId: MemoriaSizeId
  game: MemoriaGame | null
  /** Par fallido que se está mostrando en rojo. */
  wrong: number[]
  /** Hay un par volteado esperando resolverse: se ignoran los toques. */
  locked: boolean
  elapsedMs: number
  timerRunning: boolean
  timerStarted: boolean
  isWindowFocused: boolean
  pausedByBlur: boolean
  solved: boolean
  revealed: boolean
  showModal: boolean
  newBest: boolean
  isLoading: boolean
  errorMessage: string | null
}

const state: AppState = {
  sizeId: '4x5',
  game: null,
  wrong: [],
  locked: false,
  elapsedMs: 0,
  timerRunning: false,
  timerStarted: false,
  isWindowFocused: true,
  pausedByBlur: false,
  solved: false,
  revealed: false,
  showModal: false,
  newBest: false,
  isLoading: true,
  errorMessage: null,
}

let root: HTMLDivElement | null = null
let timerStartedAt = 0
let timerHandle: number | null = null
let resizeObserver: ResizeObserver | null = null
/** Tiempos pendientes de la partida actual (volteos, par fallido, modal). */
const pending = new Set<number>()
/** Sube con cada partida nueva: un tiempo pendiente de otra partida no hace nada. */
let generation = 0

// ---------- Ciclo de vida ----------

export function mountMemoriaApp(): void {
  const found = document.querySelector<HTMLDivElement>('#app')
  if (!found) throw new Error('No se encontró el elemento #app')

  root = found
  readSettings()
  state.isWindowFocused = document.hasFocus()

  root.addEventListener('click', handleClick)
  window.addEventListener('blur', handleFocusChange)
  window.addEventListener('focus', handleFocusChange)
  document.addEventListener('visibilitychange', handleFocusChange)

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => layoutBoard())
  } else {
    window.addEventListener('resize', layoutBoard)
  }

  state.isLoading = true
  render()

  loadMemoriaGlyphs()
    .then(() => {
      if (!root) return
      state.isLoading = false
      newGame()
    })
    .catch((error: unknown) => {
      console.error(error)
      state.isLoading = false
      state.errorMessage = 'No se pudieron cargar las cartas. Intenta de nuevo.'
      render()
    })
}

export function unmountMemoriaApp(): void {
  root?.removeEventListener('click', handleClick)
  window.removeEventListener('blur', handleFocusChange)
  window.removeEventListener('focus', handleFocusChange)
  document.removeEventListener('visibilitychange', handleFocusChange)
  window.removeEventListener('resize', layoutBoard)

  resizeObserver?.disconnect()
  resizeObserver = null

  pauseTimer()
  clearPending()

  if (root) root.innerHTML = ''
  root = null
}

function later(fn: () => void, ms: number): void {
  const gen = generation
  const handle = window.setTimeout(() => {
    pending.delete(handle)
    if (gen === generation && root) fn()
  }, ms)
  pending.add(handle)
}

function clearPending(): void {
  for (const handle of pending) window.clearTimeout(handle)
  pending.clear()
}

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function flipDelay(): number {
  return reducedMotion() ? 0 : FLIP_MS
}

// ---------- Preferencias ----------

function readSettings(): void {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as { size?: unknown }
    if (isMemoriaSizeId(parsed.size)) state.sizeId = parsed.size
  } catch {
    // Preferencias corruptas: se usan las de fábrica.
  }
}

function writeSettings(): void {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ size: state.sizeId }))
  } catch {
    // Sin almacenamiento: la preferencia solo dura la sesión.
  }
}

// ---------- Partida ----------

function newGame(): void {
  generation += 1
  clearPending()

  state.game = createMemoriaGame(state.sizeId)
  state.wrong = []
  state.locked = false
  state.solved = false
  state.revealed = false
  state.showModal = false
  state.newBest = false
  state.pausedByBlur = false
  resetTimer()
  render()
}

function handleCardTap(index: number): void {
  const game = state.game
  if (!game || state.locked || state.solved || state.pausedByBlur) return

  const result = flipCard(game, index)
  if (result === 'ignored') return

  if (!state.timerStarted) startTimer()
  refreshCards([index])

  if (result === 'first') return

  // Segunda carta: se espera a que termine de voltearse antes de juzgar el par.
  state.locked = true

  later(() => {
    if (openIsMatch(game)) {
      const resolved = resolveOpen(game)
      state.locked = false
      refreshCards(resolved?.cards ?? [])
      if (isMemoriaComplete(game)) completeGame()
      return
    }

    state.wrong = [...game.open]
    refreshCards(state.wrong)

    later(() => {
      const resolved = resolveOpen(game)
      state.wrong = []
      state.locked = false
      refreshCards(resolved?.cards ?? [])
    }, MISMATCH_MS)
  }, flipDelay())
}

function completeGame(): void {
  state.solved = true
  pauseTimer()

  state.newBest = submitRecord({
    gameId: 'memoria',
    packId: memoriaPackId(state.sizeId),
    levelId: 'aleatorio',
    rawTimeMs: state.elapsedMs,
    hintsUsed: 0,
  }).isNewBest

  renderStatusOnly()

  // Primero se ve el último par en magenta; luego se destapa todo y sale el modal.
  later(() => {
    state.revealed = true
    state.showModal = true
    render()
  }, SOLVED_MODAL_DELAY_MS)
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

function handleFocusChange(): void {
  const isFocused = document.hasFocus() && document.visibilityState === 'visible'
  if (isFocused === state.isWindowFocused) return

  state.isWindowFocused = isFocused

  if (!isFocused) {
    if (!state.timerRunning) return
    state.pausedByBlur = true
    pauseTimer()
    renderPauseOnly()
  } else if (state.pausedByBlur) {
    state.pausedByBlur = false
    if (!state.solved && state.game) startTimer()
    renderPauseOnly()
  }
}

// ---------- Clics ----------

function handleClick(event: MouseEvent): void {
  const target = event.target as HTMLElement | null
  if (!target) return

  const card = target.closest<HTMLElement>('[data-card]')
  if (card) {
    handleCardTap(Number(card.dataset.card))
    return
  }

  const sizeButton = target.closest<HTMLButtonElement>('[data-action="memoria-size"]')
  if (sizeButton) {
    const size = sizeButton.dataset.size
    if (isMemoriaSizeId(size) && size !== state.sizeId) {
      state.sizeId = size
      writeSettings()
      newGame()
    }
    return
  }

  if (target.closest('[data-action="new-game"]')) {
    if (state.game) newGame()
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

  // Tocar fuera de la tarjeta también cierra el modal.
  if (state.showModal && target.classList.contains('modal-overlay')) {
    state.showModal = false
    render()
  }
}

// ---------- Render parcial ----------

function renderTimerOnly(): void {
  const element = root?.querySelector('[data-timer]')
  if (element) element.textContent = formatClock(state.elapsedMs)
}

function renderStatusOnly(): void {
  const status = root?.querySelector('[data-memoria-status]')
  if (status) status.innerHTML = renderStatus()
}

function renderPauseOnly(): void {
  root?.querySelector('.pause-overlay')?.remove()
  if (state.pausedByBlur) root?.insertAdjacentHTML('beforeend', pauseOverlay())
}

function refreshCards(indices: number[]): void {
  const game = state.game
  if (!game || !root) return

  for (const index of indices) {
    const element = root.querySelector<HTMLElement>(`[data-card="${index}"]`)
    if (element)
      updateMemoriaCard(element, game, index, cardView(game, index, state.wrong, state.revealed))
  }
}

/** Ajusta el tamaño de carta al espacio disponible, sin repintar. */
function layoutBoard(): void {
  const stage = root?.querySelector<HTMLElement>('[data-memoria-stage]')
  const board = stage?.querySelector<HTMLElement>('[data-memoria-board]')
  if (!stage || !board || !state.game) return

  const { cols, rows } = state.game.size
  const { w, h } = cardSize(cols, rows, stage.clientWidth, stage.clientHeight, CARD_GAP)

  board.style.setProperty('--card-w', `${w}px`)
  board.style.setProperty('--card-h', `${h}px`)
}

// ---------- Render ----------

function render(): void {
  if (!root) return

  root.innerHTML = `
    <div class="app-shell memoria-shell">
      ${renderGameHeader('memoria')}
      ${renderMain()}
    </div>
    ${state.showModal ? renderCompletionModal() : ''}
    ${state.pausedByBlur ? pauseOverlay() : ''}
  `

  resizeObserver?.disconnect()
  const stage = root.querySelector<HTMLElement>('[data-memoria-stage]')
  if (stage) {
    layoutBoard()
    resizeObserver?.observe(stage)
  }
}

function renderStatus(): string {
  if (state.solved) {
    return `<span class="timer memoria-solved" aria-label="Resuelto en ${formatClock(state.elapsedMs)}">${icon('check', 24)}${formatClock(state.elapsedMs)}</span>`
  }
  return `<span class="timer" data-timer aria-label="Tiempo">${formatClock(state.elapsedMs)}</span>`
}

function renderMain(): string {
  const chips = MEMORIA_SIZES.map((size) => ({
    label: size.label,
    active: size.id === state.sizeId,
    attrs: `data-size="${size.id}"`,
  }))
  const chipNav = segmented('Tamaño del tablero', 'memoria-size', chips, 'memoria-chips')

  const bar = `
    <div class="memoria-bar">
      <div class="memoria-status" data-memoria-status>${renderStatus()}</div>
      ${
        state.solved && !state.showModal
          ? `<button type="button" class="control-button memoria-results" data-action="show-results"
                     aria-label="Ver resultados" title="Ver resultados">${icon('trophy')}</button>`
          : ''
      }
      ${button({
        action: 'new-game',
        label: 'Nueva partida',
        icon: 'rotate-ccw',
        disabled: !state.game,
      })}
    </div>
  `

  if (state.errorMessage) {
    return `
      <div class="memoria-layout">
        <div class="state-message state-error">${state.errorMessage}</div>
      </div>
    `
  }

  const game = state.game
  if (state.isLoading || !game) {
    return `
      <div class="memoria-layout">
        ${bar}
        ${chipNav}
        <div class="state-message">Preparando cartas…</div>
      </div>
    `
  }

  const cards = game.cards
    .map((_, index) =>
      renderMemoriaCard(game, index, cardView(game, index, state.wrong, state.revealed))
    )
    .join('')

  return `
    <div class="memoria-layout">
      ${bar}
      ${chipNav}
      <div class="memoria-stage" data-memoria-stage>
        <div class="memoria-board" data-memoria-board
             style="--cols:${game.size.cols};--rows:${game.size.rows};--gap:${CARD_GAP}px"
             aria-label="Tablero de ${game.size.label}">${cards}</div>
      </div>
    </div>
  `
}

function renderCompletionModal(): string {
  const size = getMemoriaSize(state.sizeId)
  const best = getBestTime('memoria', memoriaPackId(state.sizeId))

  return celebration({
    eyebrow: '¡Encontraste todos los pares!',
    title: `Memoria ${size.label}`,
    titleId: 'memoria-modal-title',
    className: 'memoria-modal',
    stats: [
      { label: 'Tiempo', value: formatClock(state.elapsedMs), trophy: state.newBest },
      { label: 'Mejor', value: best !== null ? formatClock(best) : '—' },
    ],
    note: state.newBest ? `Nuevo mejor tiempo en ${size.label}` : undefined,
    primary: { action: 'new-game', label: 'Nueva partida', icon: 'rotate-ccw' },
    secondary: [{ action: 'close-modal', label: 'Cerrar' }],
  })
}
