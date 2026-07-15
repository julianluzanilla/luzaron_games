import type { GameId } from '../app/types'
import { getDb } from './db'
import type { DownloadedPack } from './db-types'

export async function savePack(pack: DownloadedPack): Promise<void> {
  const db = await getDb()
  await db.put('packs', pack)
}

export async function getPackById(packId: string): Promise<DownloadedPack | undefined> {
  const db = await getDb()
  return db.get('packs', packId)
}

export async function getAllPacks(): Promise<DownloadedPack[]> {
  const db = await getDb()
  return db.getAll('packs')
}

export async function getPacksByGame(gameId: GameId): Promise<DownloadedPack[]> {
  const db = await getDb()
  return db.getAllFromIndex('packs', 'by-game', gameId)
}

export async function getDownloadedPacks(): Promise<DownloadedPack[]> {
  const db = await getDb()
  return db.getAllFromIndex('packs', 'by-status', 'downloaded')
}

export async function updatePackStatus(
  packId: string,
  status: DownloadedPack['status']
): Promise<void> {
  const db = await getDb()
  const existingPack = await db.get('packs', packId)

  if (!existingPack) return

  const updatedPack: DownloadedPack = {
    ...existingPack,
    status,
    updatedAt: new Date().toISOString(),
    downloadedAt: status === 'downloaded' ? new Date().toISOString() : existingPack.downloadedAt,
  }

  await db.put('packs', updatedPack)
}

export async function deletePack(packId: string): Promise<void> {
  const db = await getDb()
  await db.delete('packs', packId)
}
