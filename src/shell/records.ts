/**
 * Récords del jugador.
 *
 * Un record por partida terminada, con la forma del PRODUCT_SPEC §9. Se guarda
 * primero en IndexedDB (funciona sin red) y se sube al backend en cuanto se
 * pueda; `clientId` hace la subida idempotente, así que reintentar nunca
 * duplica.
 *
 * Dos niveles de identidad:
 * - `levelId` es el puzzle concreto — es lo que permitirá los rankings por
 *   puzzle del §14.
 * - `packId` es la categoría que ve el jugador (queens-8x8, sudoku-classic-normal,
 *   mahjong-turtle). El "mejor tiempo" que enseña cada juego es el mínimo de esa
 *   categoría, y se guarda aparte con `levelId = '*'` para poder leerlo sin
 *   recorrer el historial.
 *
 * El **invitado no guarda nada**: sus mejores tiempos viven en memoria y se
 * pierden al recargar. Es lo acordado, y es lo que empuja a crear cuenta.
 */

import { apiBestTimes, apiPushRecords, OfflineError, type RecordUpload } from './api'
import {
  bestKey,
  readBests,
  replaceBests,
  readPendingRecords,
  markRecordsSynced,
  saveRecord,
} from './db'
import { getCurrentUser, onSessionChange } from './session'

/** `levelId` reservado para el mejor tiempo agregado de una categoría. */
const CATEGORY_LEVEL = '*'

const LEGACY_MIGRATED_KEY = 'luzaron-legacy-bests-migrated-v1'

export interface RecordInput {
  gameId: string
  /** Categoría visible: tamaño, variante+dificultad o layout. */
  packId: string
  /** Puzzle concreto dentro de la categoría. */
  levelId: string
  rawTimeMs: number
  hintsUsed: number
  hintPenaltyMs?: number
}

export interface SubmitResult {
  /** Mejoró el mejor tiempo de esa categoría. */
  isNewBest: boolean
  /** false para invitado: se jugó, pero no se guardó. */
  saved: boolean
}

/** Cache en memoria: `${gameId}|${packId}` → mejor tiempo final en ms. */
const bestCache = new Map<string, number>()

let currentUserId: string | null = null
let flushing = false

function cacheKey(gameId: string, packId: string): string {
  return `${gameId}|${packId}`
}

function newClientId(): string {
  if (crypto.randomUUID) return crypto.randomUUID()

  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/* ---------------------------------------------------------------------- */
/* Lectura                                                                 */
/* ---------------------------------------------------------------------- */

/** Mejor tiempo de la categoría, o null si todavía no hay. Es síncrono a propósito:
 *  los juegos lo piden en pleno render. */
export function getBestTime(gameId: string, packId: string): number | null {
  return bestCache.get(cacheKey(gameId, packId)) ?? null
}

/* ---------------------------------------------------------------------- */
/* Escritura                                                               */
/* ---------------------------------------------------------------------- */

/**
 * Registra una partida terminada. Devuelve si fue nuevo récord para que el
 * juego pueda celebrarlo en el modal.
 *
 * Solo cuenta como récord una partida **limpia** (sin pistas), igual que hoy.
 */
export function submitRecord(input: RecordInput): SubmitResult {
  const hintPenaltyMs = input.hintPenaltyMs ?? 0
  const finalTimeMs = input.rawTimeMs + hintPenaltyMs
  const isClean = input.hintsUsed === 0

  const key = cacheKey(input.gameId, input.packId)
  const previous = bestCache.get(key) ?? null
  const isNewBest = isClean && (previous === null || finalTimeMs < previous)

  if (isNewBest) bestCache.set(key, finalTimeMs)

  const user = getCurrentUser()

  if (!user) {
    // Invitado: el mejor tiempo se ve durante la sesión, pero no se persiste.
    return { isNewBest, saved: false }
  }

  const upload: RecordUpload = {
    clientId: newClientId(),
    gameId: input.gameId,
    packId: input.packId,
    levelId: input.levelId,
    rawTimeMs: input.rawTimeMs,
    finalTimeMs,
    hintsUsed: input.hintsUsed,
    hintPenaltyMs,
    isCleanRecord: isClean,
    completedAt: new Date().toISOString(),
  }

  void persist(user.id, upload, isNewBest)

  return { isNewBest, saved: true }
}

async function persist(userId: string, upload: RecordUpload, isNewBest: boolean): Promise<void> {
  await saveRecord({ ...upload, userId, synced: false })

  if (isNewBest) {
    await import('./db').then(({ writeBest }) =>
      writeBest({
        key: bestKey(userId, upload.gameId, upload.packId, CATEGORY_LEVEL),
        userId,
        gameId: upload.gameId,
        packId: upload.packId,
        levelId: CATEGORY_LEVEL,
        finalTimeMs: upload.finalTimeMs,
        completedAt: upload.completedAt,
      })
    )
  }

  void flushQueue()
}

/* ---------------------------------------------------------------------- */
/* Sincronización                                                          */
/* ---------------------------------------------------------------------- */

/** Sube lo pendiente. Silencioso: si no hay red se reintenta al reconectar. */
export async function flushQueue(): Promise<void> {
  const user = getCurrentUser()

  if (!user || flushing || !navigator.onLine) return

  flushing = true

  try {
    const pending = await readPendingRecords(user.id)
    if (pending.length === 0) return

    // De 50 en 50 para no armar peticiones enormes tras un viaje largo offline.
    for (let index = 0; index < pending.length; index += 50) {
      const batch = pending.slice(index, index + 50)
      const { accepted } = await apiPushRecords(
        batch.map(({ userId: _userId, synced: _synced, ...upload }) => upload)
      )
      await markRecordsSynced(accepted)
    }
  } catch (error) {
    if (!(error instanceof OfflineError)) {
      // Un error real del servidor no debe romper la partida en curso.
      console.warn('No se pudieron subir los récords pendientes.', error)
    }
  } finally {
    flushing = false
  }
}

/** Trae del servidor los mejores tiempos y los deja en caché e IndexedDB. */
async function pullBests(userId: string): Promise<void> {
  try {
    const { bests } = await apiBestTimes()
    const now = new Date().toISOString()

    const rows = bests.map((best) => ({
      key: bestKey(userId, best.gameId, best.packId, best.levelId),
      userId,
      gameId: best.gameId,
      packId: best.packId,
      levelId: best.levelId,
      finalTimeMs: best.finalTimeMs,
      completedAt: now,
    }))

    await replaceBests(userId, rows)

    for (const best of rows) {
      const key = cacheKey(best.gameId, best.packId)
      const local = bestCache.get(key)
      if (local === undefined || best.finalTimeMs < local) {
        bestCache.set(key, best.finalTimeMs)
      }
    }
  } catch {
    // Sin red: nos quedamos con lo que hay en IndexedDB.
  }
}

/* ---------------------------------------------------------------------- */
/* Migración de los mejores tiempos viejos                                 */
/* ---------------------------------------------------------------------- */

/**
 * Antes del backend, cada juego guardaba su mejor tiempo suelto en
 * localStorage. La primera vez que alguien inicia sesión en este aparato esos
 * tiempos se adoptan como suyos, para no empezar de cero. Solo pasa una vez.
 */
async function migrateLegacyBests(): Promise<void> {
  let alreadyDone = false

  try {
    alreadyDone = window.localStorage.getItem(LEGACY_MIGRATED_KEY) === '1'
  } catch {
    return
  }

  if (alreadyDone) return

  const legacy: { gameId: string; packId: string; finalTimeMs: number }[] = []

  const collect = (prefix: string, gameId: string, toPackId: (suffix: string) => string): void => {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const storageKey = window.localStorage.key(index)
      if (!storageKey || !storageKey.startsWith(prefix)) continue

      const value = Number(window.localStorage.getItem(storageKey))
      if (!Number.isFinite(value) || value <= 0) continue

      legacy.push({ gameId, packId: toPackId(storageKey.slice(prefix.length)), finalTimeMs: value })
    }
  }

  collect('luzaron-queens-best-v1:', 'queens', (size) => `queens-${size}x${size}`)
  collect('luzaron-sudoku-best-v1:', 'sudoku', (suffix) => `sudoku-${suffix}`)
  collect('luzaron-mahjong-best-v1:', 'mahjong', (layout) => `mahjong-${layout}`)

  for (const entry of legacy) {
    const key = cacheKey(entry.gameId, entry.packId)
    const current = bestCache.get(key)

    if (current === undefined || entry.finalTimeMs < current) {
      bestCache.set(key, entry.finalTimeMs)

      submitRecord({
        gameId: entry.gameId,
        packId: entry.packId,
        levelId: 'legacy',
        rawTimeMs: entry.finalTimeMs,
        hintsUsed: 0,
      })
    }
  }

  try {
    window.localStorage.setItem(LEGACY_MIGRATED_KEY, '1')
  } catch {
    // Sin almacenamiento: se reintentaría, pero el clientId evita duplicados.
  }
}

/* ---------------------------------------------------------------------- */
/* Arranque                                                                */
/* ---------------------------------------------------------------------- */

/** Carga los récords del usuario actual. Se vuelve a llamar solo al cambiar de sesión. */
export async function loadRecordsForCurrentUser(): Promise<void> {
  const user = getCurrentUser()

  bestCache.clear()
  currentUserId = user?.id ?? null

  if (!user) return

  for (const best of await readBests(user.id)) {
    bestCache.set(cacheKey(best.gameId, best.packId), best.finalTimeMs)
  }

  await migrateLegacyBests()
  await pullBests(user.id)
  void flushQueue()
}

export function initRecords(): void {
  onSessionChange((session) => {
    const nextId = session.user?.id ?? null
    if (nextId !== currentUserId) void loadRecordsForCurrentUser()
  })

  window.addEventListener('online', () => void flushQueue())
}
