import type { WordleGuess, WordleLetterState } from './wordle-types'

/**
 * Normaliza como lo hace el generador de diccionarios: mayúsculas, sin
 * tildes y con Ñ convertida en N (regla 13.3 del PRODUCT_SPEC).
 */
export function normalizeWord(word: string): string {
  return word
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

export function isLetter(key: string): boolean {
  return /^[A-Z]$/.test(normalizeWord(key))
}

/**
 * Evalúa un intento contra la solución.
 *
 * Las letras repetidas se resuelven en dos pasadas, igual que el Wordle
 * original: primero se marcan las correctas y solo las apariciones que
 * sobran de esa letra pueden pintarse de amarillo.
 */
export function scoreGuess(guess: string, answer: string): WordleLetterState[] {
  const states: WordleLetterState[] = Array.from({ length: guess.length }, () => 'absent')
  const remaining = new Map<string, number>()

  for (let index = 0; index < answer.length; index += 1) {
    if (guess[index] === answer[index]) {
      states[index] = 'correct'
    } else {
      const letter = answer[index]
      remaining.set(letter, (remaining.get(letter) ?? 0) + 1)
    }
  }

  for (let index = 0; index < guess.length; index += 1) {
    if (states[index] === 'correct') continue

    const letter = guess[index]
    const left = remaining.get(letter) ?? 0

    if (left > 0) {
      states[index] = 'present'
      remaining.set(letter, left - 1)
    }
  }

  return states
}

const STATE_RANK: Record<WordleLetterState, number> = {
  unused: 0,
  absent: 1,
  present: 2,
  correct: 3,
}

/** Estado acumulado de cada tecla: nunca retrocede (amarillo no borra verde). */
export function buildKeyboardStates(guesses: WordleGuess[]): Map<string, WordleLetterState> {
  const keys = new Map<string, WordleLetterState>()

  for (const guess of guesses) {
    for (let index = 0; index < guess.word.length; index += 1) {
      const letter = guess.word[index]
      const state = guess.states[index]
      const current = keys.get(letter) ?? 'unused'

      if (STATE_RANK[state] > STATE_RANK[current]) keys.set(letter, state)
    }
  }

  return keys
}

interface HardModeRequirements {
  /** Letra obligatoria en una posición concreta (verde ya revelado). */
  fixed: (string | null)[]
  /** Mínimo de veces que debe aparecer cada letra ya revelada. */
  minCounts: Map<string, number>
}

function buildHardModeRequirements(guesses: WordleGuess[], length: number): HardModeRequirements {
  const fixed: (string | null)[] = Array.from({ length }, () => null)
  const minCounts = new Map<string, number>()

  for (const guess of guesses) {
    const counts = new Map<string, number>()

    for (let index = 0; index < guess.word.length; index += 1) {
      const letter = guess.word[index]
      const state = guess.states[index]

      if (state === 'correct') fixed[index] = letter
      if (state === 'correct' || state === 'present') {
        counts.set(letter, (counts.get(letter) ?? 0) + 1)
      }
    }

    for (const [letter, count] of counts) {
      minCounts.set(letter, Math.max(minCounts.get(letter) ?? 0, count))
    }
  }

  return { fixed, minCounts }
}

const ORDINALS = ['1.ª', '2.ª', '3.ª', '4.ª', '5.ª', '6.ª', '7.ª']

/**
 * Modo difícil (hard mode del NYT): todas las pistas reveladas deben
 * reutilizarse en el siguiente intento. Devuelve el mensaje de error o
 * `null` si el intento es válido.
 */
export function checkHardMode(guess: string, guesses: WordleGuess[]): string | null {
  const { fixed, minCounts } = buildHardModeRequirements(guesses, guess.length)

  for (let index = 0; index < guess.length; index += 1) {
    const letter = fixed[index]
    if (letter && guess[index] !== letter) {
      return `La ${ORDINALS[index] ?? `${index + 1}.ª`} letra debe ser ${letter}`
    }
  }

  const counts = new Map<string, number>()
  for (const letter of guess) counts.set(letter, (counts.get(letter) ?? 0) + 1)

  for (const [letter, minimum] of minCounts) {
    if ((counts.get(letter) ?? 0) < minimum) {
      return minimum > 1
        ? `El intento debe llevar ${minimum} veces la letra ${letter}`
        : `El intento debe llevar la letra ${letter}`
    }
  }

  return null
}
