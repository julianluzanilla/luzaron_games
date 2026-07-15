import type { GameId } from '../app/types'
import { getDb } from './db'
import type { LocalLevel } from './db-types'

export async function saveLevel(level: LocalLevel): Promise<void> {
  const db = await getDb()
  await db.put('levels', level)
}

export async function saveLevels(levels: LocalLevel[]): Promise<void> {
  const db = await getDb()
  const tx = db.transaction('levels', 'readwrite')

  await Promise.all(levels.map((level) => tx.store.put(level)))
  await tx.done
}

export async function getLevelById(levelId: string): Promise<LocalLevel | undefined> {
  const db = await getDb()
  return db.get('levels', levelId)
}

export async function getLevelsByPack(packId: string): Promise<LocalLevel[]> {
  const db = await getDb()
  return db.getAllFromIndex('levels', 'by-pack', packId)
}

export async function getLevelsByGame(gameId: GameId): Promise<LocalLevel[]> {
  const db = await getDb()
  return db.getAllFromIndex('levels', 'by-game', gameId)
}

export async function deleteLevelsByPack(packId: string): Promise<void> {
  const db = await getDb()
  const tx = db.transaction('levels', 'readwrite')
  const index = tx.store.index('by-pack')

  let cursor = await index.openCursor(packId)

  while (cursor) {
    await cursor.delete()
    cursor = await cursor.continue()
  }

  await tx.done
}
