import { buildKeyboardStates } from './wordle-engine'
import type { WordleGuess, WordleLetterState } from './wordle-types'

export interface WordleBoardView {
  length: number
  attempts: number
  guesses: WordleGuess[]
  current: string
  /** Fila que acaba de revelarse (para animarla una sola vez). */
  revealingRow: number | null
  /** Fila que debe sacudirse por un intento inválido. */
  shakingRow: number | null
}

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
]

function renderTile(
  letter: string,
  state: WordleLetterState,
  index: number,
  revealing: boolean
): string {
  const classes = ['wordle-tile']

  if (state !== 'unused') classes.push(`tile-${state}`)
  else if (letter) classes.push('tile-filled')

  if (revealing) classes.push('tile-revealing')

  const delay = revealing ? ` style="animation-delay:${index * 120}ms"` : ''

  return `<div class="${classes.join(' ')}"${delay}>${letter}</div>`
}

function renderRow(view: WordleBoardView, rowIndex: number): string {
  const guess = view.guesses[rowIndex]
  const isCurrent = rowIndex === view.guesses.length
  const revealing = view.revealingRow === rowIndex
  const classes = ['wordle-row']

  if (view.shakingRow === rowIndex) classes.push('row-shake')

  const tiles: string[] = []

  for (let index = 0; index < view.length; index += 1) {
    if (guess) {
      tiles.push(
        renderTile(guess.word[index] ?? '', guess.states[index] ?? 'unused', index, revealing)
      )
    } else if (isCurrent) {
      tiles.push(renderTile(view.current[index] ?? '', 'unused', index, false))
    } else {
      tiles.push(renderTile('', 'unused', index, false))
    }
  }

  return `<div class="${classes.join(' ')}">${tiles.join('')}</div>`
}

export function renderWordleBoard(view: WordleBoardView): string {
  const rows: string[] = []

  for (let rowIndex = 0; rowIndex < view.attempts; rowIndex += 1) {
    rows.push(renderRow(view, rowIndex))
  }

  return `<div class="wordle-board" style="--wordle-length:${view.length};--wordle-attempts:${view.attempts}">${rows.join('')}</div>`
}

export function renderWordleKeyboard(guesses: WordleGuess[]): string {
  const states = buildKeyboardStates(guesses)

  const rows = KEYBOARD_ROWS.map((row, rowIndex) => {
    const keys = row
      .map((key) => {
        const isAction = key === 'ENTER' || key === 'BACKSPACE'
        const state = isAction ? 'unused' : (states.get(key) ?? 'unused')
        const classes = ['wordle-key']

        if (isAction) classes.push('wordle-key-wide')
        if (state !== 'unused') classes.push(`key-${state}`)

        const label =
          key === 'BACKSPACE'
            ? '⌫'
            : key === 'ENTER'
              ? '<span class="wordle-key-label">Enviar</span>' +
                '<span class="wordle-key-label-mini" aria-hidden="true">↵</span>'
              : key
        const aria =
          key === 'BACKSPACE' ? 'Borrar' : key === 'ENTER' ? 'Enviar intento' : `Letra ${key}`

        return `<button type="button" class="${classes.join(' ')}" data-action="wordle-key" data-key="${key}" aria-label="${aria}">${label}</button>`
      })
      .join('')

    // La fila de en medio lleva media tecla de aire a cada lado: así las tres
    // filas reparten las mismas 10 unidades y todas las letras miden igual.
    const spacer = '<div class="wordle-key-spacer" aria-hidden="true"></div>'
    const content = rowIndex === 1 ? spacer + keys + spacer : keys

    return `<div class="wordle-keyboard-row">${content}</div>`
  })

  return `<div class="wordle-keyboard" aria-label="Teclado virtual">${rows.join('')}</div>`
}
