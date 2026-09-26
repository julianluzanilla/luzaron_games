import { renderWordleBoard, renderWordleKeyboard } from './games/wordle/wordle-board-renderer'
import { checkHardMode, normalizeWord, scoreGuess } from './games/wordle/wordle-engine'
import {
  dailyKey,
  dailyNumber,
  getDailyWord,
  getPracticeWord,
  loadDefinitions,
  loadDictionary,
  type WordleDefinition,
  type WordleDefinitions,
  type WordleDictionary,
} from './games/wordle/wordle-words'
import {
  DEFAULT_WORDLE_SETTINGS,
  attemptsForLength,
  type WordleDifficulty,
  type WordleGuess,
  type WordleLanguage,
  type WordleLength,
  type WordleMode,
  type WordleSettings,
} from './games/wordle/wordle-types'
import { renderGameHeader } from './shell/app-header'
import { button, celebration, segmented } from './shell/ui'
import { getCurrentUser } from './shell/session'

const SETTINGS_KEY = 'luzaron-wordle-settings-v1'
const DAILY_KEY_PREFIX = 'luzaron-wordle-daily-v1:'
const MODE_KEY = 'luzaron-wordle-mode-v1'

const LANGUAGE_LABELS: Record<WordleLanguage, string> = { es: 'Español', en: 'English' }
const DIFFICULTY_LABELS: Record<WordleDifficulty, string> = { normal: 'Normal', hard: 'Difícil' }

type GameStatus = 'playing' | 'won' | 'lost'

interface AppState {
  settings: WordleSettings
  mode: WordleMode
  dictionary: WordleDictionary | null
  /** Definiciones del idioma y longitud en curso (se cargan en segundo plano). */
  definitions: WordleDefinitions | null
  answer: string
  puzzleNumber: number
  guesses: WordleGuess[]
  current: string
  status: GameStatus
  message: string | null
  revealingRow: number | null
  shakingRow: number | null
  settingsOpen: boolean
  modalOpen: boolean
  isLoading: boolean
  errorMessage: string | null
}

const state: AppState = {
  settings: { ...DEFAULT_WORDLE_SETTINGS },
  mode: 'daily',
  dictionary: null,
  definitions: null,
  answer: '',
  puzzleNumber: 0,
  guesses: [],
  current: '',
  status: 'playing',
  message: null,
  revealingRow: null,
  shakingRow: null,
  settingsOpen: false,
  modalOpen: false,
  isLoading: true,
  errorMessage: null,
}

let root: HTMLDivElement | null = null
let messageHandle: number | null = null
let revealHandle: number | null = null
let shakeHandle: number | null = null

export function mountWordleApp(): void {
  const found = document.querySelector<HTMLDivElement>('#app')

  if (!found) throw new Error('No se encontró el elemento #app')

  root = found
  state.settings = readSettings()
  state.mode = readMode()

  root.addEventListener('click', handleClick)
  window.addEventListener('keydown', handleKeyDown)

  render()
  void startGame()
}

export function unmountWordleApp(): void {
  root?.removeEventListener('click', handleClick)
  window.removeEventListener('keydown', handleKeyDown)

  clearTimer(messageHandle)
  clearTimer(revealHandle)
  clearTimer(shakeHandle)
  messageHandle = revealHandle = shakeHandle = null

  if (root) root.innerHTML = ''
  root = null
}

function clearTimer(handle: number | null): void {
  if (handle !== null) window.clearTimeout(handle)
}

// ---------- Preferencias ----------

function readSettings(): WordleSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_WORDLE_SETTINGS }

    const parsed = JSON.parse(raw) as Partial<WordleSettings>

    return {
      language: parsed.language === 'en' ? 'en' : 'es',
      length: parsed.length === 6 ? 6 : 5,
      difficulty: parsed.difficulty === 'hard' ? 'hard' : 'normal',
    }
  } catch {
    return { ...DEFAULT_WORDLE_SETTINGS }
  }
}

function writeSettings(): void {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings))
  } catch {
    // Sin almacenamiento: las preferencias solo duran la sesión.
  }
}

function readMode(): WordleMode {
  return window.localStorage.getItem(MODE_KEY) === 'practice' ? 'practice' : 'daily'
}

function writeMode(): void {
  try {
    window.localStorage.setItem(MODE_KEY, state.mode)
  } catch {
    // Sin almacenamiento: el modo vuelve a Diaria en la próxima visita.
  }
}

// ---------- Avance de la partida diaria ----------

interface StoredDaily {
  date: string
  guesses: string[]
}

/**
 * El avance de la palabra diaria se guarda por usuario: si en la tablet juegan
 * dos hermanos, cada quien tiene su intento del dia. El invitado usa su propio
 * espacio, que se comparte entre todos los invitados de ese aparato.
 */
function dailyStorageKey(): string {
  const owner = getCurrentUser()?.id ?? 'guest'

  return `${DAILY_KEY_PREFIX}${owner}:${state.settings.language}-${state.settings.length}`
}

function readDailyProgress(): StoredDaily | null {
  try {
    const raw = window.localStorage.getItem(dailyStorageKey())
    if (!raw) return null

    const parsed = JSON.parse(raw) as StoredDaily

    return parsed.date === dailyKey() && Array.isArray(parsed.guesses) ? parsed : null
  } catch {
    return null
  }
}

function writeDailyProgress(): void {
  if (state.mode !== 'daily') return

  try {
    const payload: StoredDaily = {
      date: dailyKey(),
      guesses: state.guesses.map((guess) => guess.word),
    }

    window.localStorage.setItem(dailyStorageKey(), JSON.stringify(payload))
  } catch {
    // Sin almacenamiento: el avance del día no se recupera al recargar.
  }
}

// ---------- Ciclo de vida de la partida ----------

async function startGame(): Promise<void> {
  state.isLoading = true
  state.errorMessage = null
  state.modalOpen = false
  render()

  try {
    const { language, length } = state.settings
    const dictionary = await loadDictionary(language, length)

    state.dictionary = dictionary
    state.definitions = null
    state.guesses = []

    // Las definiciones no hacen falta para jugar, así que se piden aparte y
    // sin bloquear: para cuando termine la partida ya están en memoria.
    void loadDefinitions(language, length).then((definitions) => {
      if (state.settings.language === language && state.settings.length === length) {
        state.definitions = definitions
      }
    })

    state.current = ''
    state.status = 'playing'
    state.message = null
    state.revealingRow = null
    state.shakingRow = null

    if (state.mode === 'daily') {
      state.answer = getDailyWord(dictionary, language, length)
      state.puzzleNumber = dailyNumber()
      restoreDailyProgress()
    } else {
      state.answer = getPracticeWord(dictionary, language, length)
      state.puzzleNumber = 0
    }

    state.isLoading = false
  } catch (error) {
    console.error(error)
    state.errorMessage = 'No se pudo cargar el diccionario. Revisa tu conexión e intenta de nuevo.'
    state.isLoading = false
  }

  render()
}

function restoreDailyProgress(): void {
  const stored = readDailyProgress()

  if (!stored) return

  const attempts = attemptsForLength(state.settings.length)

  for (const word of stored.guesses.slice(0, attempts)) {
    if (word.length !== state.settings.length) continue
    state.guesses.push({ word, states: scoreGuess(word, state.answer) })
  }

  const last = state.guesses.at(-1)

  if (last?.word === state.answer) state.status = 'won'
  else if (state.guesses.length >= attempts) state.status = 'lost'
}

// ---------- Entrada del jugador ----------

function showMessage(text: string): void {
  state.message = text
  clearTimer(messageHandle)

  messageHandle = window.setTimeout(() => {
    state.message = null
    render()
  }, 2200)
}

function shakeCurrentRow(): void {
  state.shakingRow = state.guesses.length
  clearTimer(shakeHandle)

  shakeHandle = window.setTimeout(() => {
    state.shakingRow = null
    render()
  }, 620)
}

function typeLetter(letter: string): void {
  if (!canPlay()) return
  if (state.current.length >= state.settings.length) return

  state.current += letter
  render()
}

function deleteLetter(): void {
  if (!canPlay()) return
  if (state.current.length === 0) return

  state.current = state.current.slice(0, -1)
  render()
}

function canPlay(): boolean {
  return (
    !state.isLoading &&
    !state.errorMessage &&
    state.status === 'playing' &&
    state.revealingRow === null
  )
}

function submitGuess(): void {
  if (!canPlay() || !state.dictionary) return

  const guess = state.current

  if (guess.length < state.settings.length) {
    showMessage('Faltan letras')
    shakeCurrentRow()
    render()
    return
  }

  if (!state.dictionary.valid.has(guess)) {
    showMessage('Esa palabra no está en el diccionario')
    shakeCurrentRow()
    render()
    return
  }

  if (state.settings.difficulty === 'hard') {
    const problem = checkHardMode(guess, state.guesses)

    if (problem) {
      showMessage(problem)
      shakeCurrentRow()
      render()
      return
    }
  }

  const rowIndex = state.guesses.length

  state.guesses.push({ word: guess, states: scoreGuess(guess, state.answer) })
  state.current = ''
  state.revealingRow = rowIndex

  writeDailyProgress()
  render()

  clearTimer(revealHandle)
  revealHandle = window.setTimeout(
    () => {
      state.revealingRow = null
      void finishTurn(guess)
    },
    state.settings.length * 120 + 420
  )
}

async function finishTurn(guess: string): Promise<void> {
  const finished =
    guess === state.answer || state.guesses.length >= attemptsForLength(state.settings.length)

  if (!finished) {
    render()
    return
  }

  state.status = guess === state.answer ? 'won' : 'lost'

  // Si la descarga de definiciones todavía no terminó, se espera aquí: es el
  // único momento en que hacen falta.
  if (!state.definitions) {
    const { language, length } = state.settings
    state.definitions = await loadDefinitions(language, length)
  }

  state.modalOpen = true
  render()
}

function handleKeyDown(event: KeyboardEvent): void {
  if (event.ctrlKey || event.metaKey || event.altKey) return

  if (event.key === 'Escape') {
    if (state.settingsOpen || state.modalOpen) {
      state.settingsOpen = false
      state.modalOpen = false
      render()
    }
    return
  }

  if (state.settingsOpen) return

  if (event.key === 'Enter') {
    event.preventDefault()
    submitGuess()
    return
  }

  if (event.key === 'Backspace') {
    event.preventDefault()
    deleteLetter()
    return
  }

  const letter = normalizeWord(event.key)

  if (/^[A-Z]$/.test(letter)) {
    event.preventDefault()
    typeLetter(letter)
  }
}

function handleVirtualKey(key: string): void {
  if (key === 'ENTER') submitGuess()
  else if (key === 'BACKSPACE') deleteLetter()
  else typeLetter(key)
}

// ---------- Configuración ----------

function applyLanguage(language: WordleLanguage): void {
  if (language === state.settings.language) return

  state.settings.language = language
  writeSettings()
  void startGame()
}

function applyLength(length: WordleLength): void {
  if (length === state.settings.length) return

  state.settings.length = length
  writeSettings()
  void startGame()
}

function applyDifficulty(difficulty: WordleDifficulty): void {
  if (difficulty === state.settings.difficulty) return

  state.settings.difficulty = difficulty
  writeSettings()
  render()
}

function applyMode(mode: WordleMode): void {
  if (mode === state.mode) return

  state.mode = mode
  writeMode()
  void startGame()
}

// ---------- Eventos ----------

function handleClick(event: MouseEvent): void {
  const target = event.target as HTMLElement | null

  if (!target) return

  const key = target.closest<HTMLButtonElement>('[data-action="wordle-key"]')
  if (key) {
    handleVirtualKey(key.dataset.key ?? '')
    return
  }

  const language = target.closest<HTMLButtonElement>('[data-action="wordle-language"]')
  if (language) {
    applyLanguage(language.dataset.language === 'en' ? 'en' : 'es')
    return
  }

  const length = target.closest<HTMLButtonElement>('[data-action="wordle-length"]')
  if (length) {
    applyLength(length.dataset.length === '6' ? 6 : 5)
    return
  }

  const difficulty = target.closest<HTMLButtonElement>('[data-action="wordle-difficulty"]')
  if (difficulty) {
    applyDifficulty(difficulty.dataset.difficulty === 'hard' ? 'hard' : 'normal')
    return
  }

  const mode = target.closest<HTMLButtonElement>('[data-action="wordle-mode"]')
  if (mode) {
    applyMode(mode.dataset.mode === 'practice' ? 'practice' : 'daily')
    return
  }

  if (target.closest('[data-action="open-settings"]')) {
    state.settingsOpen = true
    render()
    return
  }

  if (target.closest('[data-action="close-settings"]')) {
    state.settingsOpen = false
    render()
    return
  }

  if (target.closest('[data-action="close-modal"]')) {
    state.modalOpen = false
    render()
    return
  }

  if (target.closest('[data-action="new-word"]')) {
    state.mode = 'practice'
    writeMode()
    void startGame()
  }
}

// ---------- Render ----------

function render(): void {
  if (!root) return

  root.innerHTML = `
    <div class="app-shell">
      ${renderGameHeader('wordle')}
      ${renderMain()}
    </div>
    ${state.settingsOpen ? renderSettings() : ''}
    ${state.modalOpen ? renderEndModal() : ''}
  `
}

function renderMain(): string {
  if (state.errorMessage) {
    return `<div class="state-message state-error">${state.errorMessage}</div>`
  }

  if (state.isLoading) {
    return `<div class="state-message">Cargando diccionario…</div>`
  }

  const { length, difficulty } = state.settings
  const attempts = attemptsForLength(length)

  return `
    <div class="game-area wordle-area">
      <div class="wordle-status-row">
        <div class="wordle-status">
          <span class="wordle-mode-label">${state.mode === 'daily' ? 'Palabra diaria' : 'Práctica'}</span>
          <span class="wordle-status-detail">
            ${state.mode === 'daily' ? `#${state.puzzleNumber} · ` : ''}${LANGUAGE_LABELS[state.settings.language]} · ${length} letras${difficulty === 'hard' ? ' · Difícil' : ''}
          </span>
        </div>
        <button type="button" class="icon-button" data-action="open-settings" aria-label="Idioma, longitud y dificultad" title="Idioma, longitud y dificultad">Aa</button>
      </div>

      <div class="wordle-message-slot">
        ${state.message ? `<p class="wordle-message">${state.message}</p>` : ''}
      </div>

      <div class="board-frame wordle-frame">
        ${renderWordleBoard({
          length,
          attempts,
          guesses: state.guesses,
          current: state.current,
          revealingRow: state.revealingRow,
          shakingRow: state.shakingRow,
        })}
      </div>

      ${renderWordleKeyboard(state.guesses)}

      ${segmented('Modo de juego', 'wordle-mode', [
        { label: 'Diaria', active: state.mode === 'daily', attrs: 'data-mode="daily"' },
        { label: 'Práctica', active: state.mode === 'practice', attrs: 'data-mode="practice"' },
      ])}
    </div>
  `
}

function chip(
  action: string,
  dataName: string,
  value: string,
  label: string,
  active: boolean
): string {
  return `<button type="button" class="size-chip ${active ? 'active' : ''}" data-action="${action}" data-${dataName}="${value}" aria-pressed="${active}">${label}</button>`
}

function renderSettings(): string {
  const { language, length, difficulty } = state.settings

  return `
    <div class="modal-overlay wordle-overlay" role="dialog" aria-modal="true">
      <div class="modal-card">
        <div class="modal-heading">
          <p class="eyebrow">Wordle</p>
          <h2>Configuración</h2>
        </div>

        <div class="settings-group">
          <h3>Idioma</h3>
          <div class="size-selector">
            ${chip('wordle-language', 'language', 'es', LANGUAGE_LABELS.es, language === 'es')}
            ${chip('wordle-language', 'language', 'en', LANGUAGE_LABELS.en, language === 'en')}
          </div>
        </div>

        <div class="settings-group">
          <h3>Longitud</h3>
          <div class="size-selector">
            ${chip('wordle-length', 'length', '5', '5 letras', length === 5)}
            ${chip('wordle-length', 'length', '6', '6 letras', length === 6)}
          </div>
        </div>

        <div class="settings-group">
          <h3>Dificultad</h3>
          <div class="size-selector">
            ${chip('wordle-difficulty', 'difficulty', 'normal', DIFFICULTY_LABELS.normal, difficulty === 'normal')}
            ${chip('wordle-difficulty', 'difficulty', 'hard', DIFFICULTY_LABELS.hard, difficulty === 'hard')}
          </div>
          <p class="settings-hint">
            En Difícil, cada intento debe reutilizar las letras ya reveladas.
          </p>
        </div>

        <div class="modal-actions">
          ${button({ action: 'close-settings', label: 'Listo', icon: 'check', variant: 'primary', className: 'control-button-hero' })}
        </div>
      </div>
    </div>
  `
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Qué significa la palabra y cómo se usa, en lenguaje de niño. */
function renderDefinition(entry: WordleDefinition): string {
  return `
    <div class="wordle-definition">
      <p class="wordle-definition-label">Qué significa</p>
      <p class="wordle-definition-text">${escapeHtml(entry.d)}</p>
      <p class="wordle-definition-example">${escapeHtml(entry.e)}</p>
    </div>
  `
}

function renderEndModal(): string {
  const won = state.status === 'won'
  const attempts = attemptsForLength(state.settings.length)

  const entry = state.definitions?.[state.answer]

  return celebration({
    eyebrow: won ? '¡Adivinaste!' : 'Se acabaron los intentos',
    // En el tablero la palabra va sin tildes, pero aquí se muestra bien
    // escrita: es la forma que conviene que se les quede.
    title: entry?.w ?? state.answer,
    className: 'wordle-end',
    stats: [
      { label: 'Intentos', value: `${won ? state.guesses.length : '—'}/${attempts}` },
      {
        label: 'Modo',
        value: state.mode === 'daily' ? `Diaria #${state.puzzleNumber}` : 'Práctica',
        text: true,
      },
    ],
    extra: entry ? renderDefinition(entry) : undefined,
    note:
      state.mode === 'daily'
        ? 'La palabra diaria cambia a la medianoche. Mientras tanto puedes seguir en modo práctica.'
        : undefined,
    primary: {
      action: 'new-word',
      label: state.mode === 'daily' ? 'Jugar práctica' : 'Nueva palabra',
      icon: 'play',
    },
    secondary: [{ action: 'close-modal', label: 'Cerrar' }],
  }).replace('class="modal-overlay"', 'class="modal-overlay wordle-overlay"')
}
