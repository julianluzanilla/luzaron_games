import type { GameId } from '../app/types'
import { getDb } from './db'
import type { GameProgress } from './db-types'

export function createProgressId(
  userId: string,
  gameId: GameId,
  packId: string,
  levelId: string
): string {
  return `${userId}:${gameId}:${packId}:${levelId}`
}

export async function saveProgress(progress: GameProgress): Promise<void> {
  const db = await getDb()

  const updatedProgress: GameProgress = {
    ...progress,
    updatedAt: new Date().toISOString(),
  }

  await db.put('progress', updatedProgress)
}

export async function getProgressById(progressId: string): Promise<GameProgress | undefined> {
  const db = await getDb()
  return db.get('progress', progressId)
}

export async function getProgressByUser(userId: string): Promise<GameProgress[]> {
  const db = await getDb()
  return db.getAllFromIndex('progress', 'by-user', userId)
}

export async function getProgressByLevel(levelId: string): Promise<GameProgress[]> {
  const db = await getDb()
  return db.getAllFromIndex('progress', 'by-level', levelId)
}

export async function getProgressByStatus(status: GameProgress['status']): Promise<GameProgress[]> {
  const db = await getDb()
  return db.getAllFromIndex('progress', 'by-status', status)
}

export async function deleteProgress(progressId: string): Promise<void> {
  const db = await getDb()
  await db.delete('progress', progressId)
}
