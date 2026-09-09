export type WordleLanguage = 'es' | 'en'
export type WordleLength = 5 | 6
export type WordleDifficulty = 'normal' | 'hard'
export type WordleMode = 'daily' | 'practice'

/** Estado de una letra ya evaluada (13.2 del PRODUCT_SPEC). */
export type WordleLetterState = 'unused' | 'absent' | 'present' | 'correct'

export interface WordleSettings {
  language: WordleLanguage
  length: WordleLength
  difficulty: WordleDifficulty
}

export interface WordleGuess {
  word: string
  states: WordleLetterState[]
}

export const WORDLE_LANGUAGES: WordleLanguage[] = ['es', 'en']
export const WORDLE_LENGTHS: WordleLength[] = [5, 6]

export const DEFAULT_WORDLE_SETTINGS: WordleSettings = {
  language: 'es',
  length: 5,
  difficulty: 'normal',
}

/** 6 intentos en palabras de 5 letras, 7 en las de 6. */
export function attemptsForLength(length: WordleLength): number {
  return length === 5 ? 6 : 7
}
