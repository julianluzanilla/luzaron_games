/**
 * IndexedDB local de la app.
 *
 * Guarda lo que tiene que sobrevivir sin internet: el usuario de la sesión,
 * el historial de partidas terminadas, el mejor tiempo por nivel y la cola de
 * lo que falta subir al backend. La estructura de un record es la del
 * PRODUCT_SPEC §9, para que subirlo a D1 sea copiar campos.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { ApiUser, RecordUpload } from './api'

const DB_NAME = 'luzaron-games'
const DB_VERSION = 1

export interface StoredRecord extends RecordUpload {
  /** Dueño del record. `guest` nunca llega aquí: el invitado no guarda. */
  userId: string
  /** false mientras siga en la cola de subida. */
  synced: boolean
}

export interface StoredBest {
  /** `${userId}|${gameId}|${packId}|${levelId}` */
  key: string
  userId: string
  gameId: string
  packId: string
  levelId: string
  finalTimeMs: number
  completedAt: string
}

interface LuzaronDB extends DBSchema {
  meta: {
    key: string
    value: unknown
  }
  records: {
    key: string
    value: StoredRecord
    indexes: { 'by-user': string }
  }
  bests: {
    key: string
    value: StoredBest
    indexes: { 'by-user': string }
  }
}

let dbPromise: Promise<IDBPDatabase<LuzaronDB>> | null = null

function getDb(): Promise<IDBPDatabase<LuzaronDB>> {
  if (!dbPromise) {
    dbPromise = openDB<LuzaronDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta')
        }

        if (!db.objectStoreNames.contains('records')) {
          const store = db.createObjectStore('records', { keyPath: 'clientId' })
          store.createIndex('by-user', 'userId')
        }

        if (!db.objectStoreNames.contains('bests')) {
          const store = db.createObjectStore('bests', { keyPath: 'key' })
          store.createIndex('by-user', 'userId')
        }
      },
    })
  }

  return dbPromise
}

/** IndexedDB puede fallar entero (Safari privado, cuota llena, iOS viejo). */
async function safe<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation()
  } catch {
    return fallback
  }
}

/* ---------------------------------------------------------------------- */
/* Meta: el usuario en caché                                               */
/* ---------------------------------------------------------------------- */

const CACHED_USER_KEY = 'cached-user'

export async function readCachedUser(): Promise<ApiUser | null> {
  return safe(async () => {
    const db = await getDb()
    return ((await db.get('meta', CACHED_USER_KEY)) as ApiUser | undefined) ?? null
  }, null)
}

export async function writeCachedUser(user: ApiUser | null): Promise<void> {
  await safe(async () => {
    const db = await getDb()
    if (user) await db.put('meta', user, CACHED_USER_KEY)
    else await db.delete('meta', CACHED_USER_KEY)
  }, undefined)
}

/* ---------------------------------------------------------------------- */
/* Records y mejores tiempos                                               */
/* ---------------------------------------------------------------------- */

export function bestKey(userId: string, gameId: string, packId: string, levelId: string): string {
  return `${userId}|${gameId}|${packId}|${levelId}`
}

export async function readBests(userId: string): Promise<StoredBest[]> {
  return safe(async () => {
    const db = await getDb()
    return await db.getAllFromIndex('bests', 'by-user', userId)
  }, [])
}

export async function writeBest(best: StoredBest): Promise<void> {
  await safe(async () => {
    const db = await getDb()
    await db.put('bests', best)
  }, undefined)
}

/** Reemplaza los mejores tiempos locales con los que mandó el servidor. */
export async function replaceBests(userId: string, bests: StoredBest[]): Promise<void> {
  await safe(async () => {
    const db = await getDb()
    const tx = db.transaction('bests', 'readwrite')
    const existing = await tx.store.index('by-user').getAllKeys(userId)

    await Promise.all(existing.map((key) => tx.store.delete(key)))
    await Promise.all(bests.map((best) => tx.store.put(best)))
    await tx.done
  }, undefined)
}

export async function saveRecord(record: StoredRecord): Promise<void> {
  await safe(async () => {
    const db = await getDb()
    await db.put('records', record)
  }, undefined)
}

/** Lo que falta por subir, más viejo primero. */
export async function readPendingRecords(userId: string): Promise<StoredRecord[]> {
  return safe(async () => {
    const db = await getDb()
    const all = await db.getAllFromIndex('records', 'by-user', userId)

    return all
      .filter((record) => !record.synced)
      .sort((a, b) => a.completedAt.localeCompare(b.completedAt))
  }, [])
}

export async function markRecordsSynced(clientIds: string[]): Promise<void> {
  if (clientIds.length === 0) return

  await safe(async () => {
    const db = await getDb()
    const tx = db.transaction('records', 'readwrite')

    for (const clientId of clientIds) {
      const record = await tx.store.get(clientId)
      if (record) {
        await tx.store.put({ ...record, synced: true })
      }
    }

    await tx.done
  }, undefined)
}

export async function readRecords(userId: string): Promise<StoredRecord[]> {
  return safe(async () => {
    const db = await getDb()
    const all = await db.getAllFromIndex('records', 'by-user', userId)
    return all.sort((a, b) => b.completedAt.localeCompare(a.completedAt))
  }, [])
}

/** Se llama al cerrar sesión: nada del usuario anterior se queda en el aparato. */
export async function clearUserData(userId: string): Promise<void> {
  await safe(async () => {
    const db = await getDb()

    const recordsTx = db.transaction('records', 'readwrite')
    const recordKeys = await recordsTx.store.index('by-user').getAllKeys(userId)
    await Promise.all(recordKeys.map((key) => recordsTx.store.delete(key)))
    await recordsTx.done

    const bestsTx = db.transaction('bests', 'readwrite')
    const bestKeys = await bestsTx.store.index('by-user').getAllKeys(userId)
    await Promise.all(bestKeys.map((key) => bestsTx.store.delete(key)))
    await bestsTx.done
  }, undefined)
}
