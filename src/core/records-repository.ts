import type { GameId } from '../app/types'
import { getDb } from './db'
import type { LocalRecord } from './db-types'
import { createId } from './ids'

export async function saveRecord(
  record: Omit<LocalRecord, 'id'> & { id?: string }
): Promise<string> {
  const db = await getDb()
  const recordId = record.id ?? createId('record')

  const localRecord: LocalRecord = {
    ...record,
    id: recordId,
  }

  await db.put('records', localRecord)

  return recordId
}

export async function getRecordById(recordId: string): Promise<LocalRecord | undefined> {
  const db = await getDb()
  return db.get('records', recordId)
}

export async function getRecordsByUser(userId: string): Promise<LocalRecord[]> {
  const db = await getDb()
  return db.getAllFromIndex('records', 'by-user', userId)
}

export async function getRecordsByLevel(levelId: string): Promise<LocalRecord[]> {
  const db = await getDb()
  return db.getAllFromIndex('records', 'by-level', levelId)
}

export async function getRecordsByGame(gameId: GameId): Promise<LocalRecord[]> {
  const db = await getDb()
  return db.getAllFromIndex('records', 'by-game', gameId)
}

export async function getTopCleanRecordsByLevel(
  levelId: string,
  limit = 3
): Promise<LocalRecord[]> {
  const records = await getRecordsByLevel(levelId)

  return records
    .filter((record) => record.isCleanRecord)
    .sort((a, b) => a.finalTimeMs - b.finalTimeMs)
    .slice(0, limit)
}

export async function markRecordAsSynced(recordId: string): Promise<void> {
  const db = await getDb()
  const existingRecord = await db.get('records', recordId)

  if (!existingRecord) return

  await db.put('records', {
    ...existingRecord,
    syncedAt: new Date().toISOString(),
  })
}

export async function deleteRecord(recordId: string): Promise<void> {
  const db = await getDb()
  await db.delete('records', recordId)
}
