import { deleteLevelsByPack, saveLevels } from './levels-repository'
import { getPackById, savePack } from './packs-repository'
import type { DownloadedPack, LocalLevel } from './db-types'
import type { LevelPackFile } from './level-catalog-types'

export async function downloadPackById(packId: string): Promise<void> {
  const pack = await getPackById(packId)

  if (!pack) {
    throw new Error(`Pack not found: ${packId}`)
  }

  await downloadStoredPack(pack)
}

async function downloadStoredPack(pack: DownloadedPack): Promise<void> {
  const now = new Date().toISOString()

  await savePack({
    ...pack,
    status: 'downloading',
    updatedAt: now,
  })

  try {
    const response = await fetch(`${pack.fileUrl}?ts=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`Could not download pack file: ${pack.fileUrl}`)
    }

    const packFile = (await response.json()) as LevelPackFile
    const levels = createLocalLevels(pack, packFile)

    await deleteLevelsByPack(pack.id)
    await saveLevels(levels)

    await savePack({
      ...pack,
      status: 'downloaded',
      levelCount: levels.length,
      downloadedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    await savePack({
      ...pack,
      status: 'error',
      updatedAt: new Date().toISOString(),
    })

    throw error
  }
}

function createLocalLevels(pack: DownloadedPack, packFile: LevelPackFile): LocalLevel[] {
  const now = new Date().toISOString()
  const levels = Array.isArray(packFile.levels) ? packFile.levels : []

  return levels.map((level, index) => ({
    id: getLevelId(pack, level, index),
    packId: pack.id,
    gameId: pack.gameId,
    data: level,
    createdAt: now,
  }))
}

function getLevelId(pack: DownloadedPack, level: unknown, index: number): string {
  if (
    typeof level === 'object' &&
    level !== null &&
    'id' in level &&
    typeof level.id === 'string'
  ) {
    return level.id
  }

  return `${pack.id}-${String(index + 1).padStart(4, '0')}`
}
