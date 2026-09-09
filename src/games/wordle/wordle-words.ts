import type { WordleLanguage, WordleLength } from './wordle-types'

/**
 * Los diccionarios viven en public/words/wordle/ y se generan con
 * `npm run words:wordle`. Ya vienen normalizados (mayúsculas, sin tildes,
 * Ñ → N) y ordenados alfabéticamente.
 */
export interface WordleDictionary {
  /** Palabras que pueden salir como solución. */
  answers: string[]
  /** Palabras aceptadas como intento (incluye todas las soluciones). */
  valid: Set<string>
}

/** Día 1 del calendario de palabras diarias. */
const EPOCH_UTC = Date.UTC(2026, 0, 1)

const cache = new Map<string, Promise<WordleDictionary>>()

function listKey(language: WordleLanguage, length: WordleLength): string {
  return `${language}-${length}`
}

async function fetchList(name: string): Promise<string[]> {
  const response = await fetch(`/words/wordle/${name}.txt`)

  if (!response.ok) throw new Error(`No se pudo cargar el diccionario ${name} (${response.status})`)

  const text = await response.text()

  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export function loadDictionary(
  language: WordleLanguage,
  length: WordleLength
): Promise<WordleDictionary> {
  const key = listKey(language, length)
  let promise = cache.get(key)

  if (!promise) {
    promise = Promise.all([fetchList(`${key}-answers`), fetchList(`${key}-valid`)]).then(
      ([answers, valid]) => ({ answers, valid: new Set(valid) })
    )

    cache.set(key, promise)
  }

  return promise
}

// ---------- Palabra diaria ----------

/** PRNG determinista: misma semilla, misma secuencia en cualquier dispositivo. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashSeed(text: string): number {
  let hash = 0x811c9dc5

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }

  return hash >>> 0
}

const orderCache = new Map<string, string[]>()

/**
 * Baraja las soluciones con una semilla fija por idioma y longitud, para que
 * el calendario diario sea idéntico en todos los dispositivos y ninguna
 * palabra se repita hasta agotar la lista.
 */
function dailyOrder(answers: string[], language: WordleLanguage, length: WordleLength): string[] {
  const key = listKey(language, length)
  const cached = orderCache.get(key)

  if (cached) return cached

  const random = mulberry32(hashSeed(`luzaron-wordle-${key}`))
  const order = [...answers]

  for (let index = order.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1))
    ;[order[index], order[swap]] = [order[swap], order[index]]
  }

  orderCache.set(key, order)

  return order
}

/** Número de día del calendario, contando desde EPOCH_UTC en hora local. */
export function dailyNumber(date = new Date()): number {
  const localMidnight = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())

  return Math.floor((localMidnight - EPOCH_UTC) / 86400000) + 1
}

/** Clave de la partida diaria, para guardar el avance del día. */
export function dailyKey(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function getDailyWord(
  dictionary: WordleDictionary,
  language: WordleLanguage,
  length: WordleLength,
  date = new Date()
): string {
  const order = dailyOrder(dictionary.answers, language, length)
  const number = dailyNumber(date)
  const index = (((number - 1) % order.length) + order.length) % order.length

  return order[index]
}

// ---------- Palabra de práctica ----------

const SEEN_KEY_PREFIX = 'luzaron-wordle-seen-v1:'

function readSeen(key: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY_PREFIX + key)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

function writeSeen(key: string, seen: Set<string>): void {
  try {
    window.localStorage.setItem(SEEN_KEY_PREFIX + key, JSON.stringify([...seen]))
  } catch {
    // Sin almacenamiento (modo privado): repetir alguna palabra es aceptable.
  }
}

/** Palabra aleatoria de práctica, evitando repetir hasta agotar la lista. */
export function getPracticeWord(
  dictionary: WordleDictionary,
  language: WordleLanguage,
  length: WordleLength
): string {
  const key = listKey(language, length)
  let seen = readSeen(key)
  let pool = dictionary.answers.filter((word) => !seen.has(word))

  if (pool.length === 0) {
    seen = new Set()
    pool = dictionary.answers
  }

  const word = pool[Math.floor(Math.random() * pool.length)]

  seen.add(word)
  writeSeen(key, seen)

  return word
}
