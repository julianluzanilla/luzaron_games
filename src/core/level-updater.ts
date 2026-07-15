import { getPackById, savePack } from './packs-repository'
import { deleteLevelsByPack, saveLevels } from './levels-repository'
import type {
  LevelCatalogManifest,
  LevelCatalogPack,
  LevelPackFile,
  LevelUpdateProgress,
  LevelUpdateSummary,
} from './level-catalog-types'
import type { LocalLevel } from './db-types'

type ProgressCallback = (progress: LevelUpdateProgress) => void

const LEVEL_MANIFEST_URL = '/levels/manifest.json'

export async function updateLevelCatalog(
  onProgress: ProgressCallback = () => {}
): Promise<LevelUpdateSummary> {
  onProgress({
    mode: 'checking',
    message: 'Buscando niveles nuevos...',
    completedPacks: 0,
    totalPacks: 0,
  })

  const manifestResponse = await fetch(`${LEVEL_MANIFEST_URL}?ts=${Date.now()}`, {
    method: 'GET',
    cache: 'no-store',
  })

  if (!manifestResponse.ok) {
    throw new Error('Could not load level manifest')
  }

  const manifest = (await manifestResponse.json()) as LevelCatalogManifest
  const totalPacks = manifest.packs.length

  if (totalPacks === 0) {
    onProgress({
      mode: 'complete',
      message: 'No hay nuevos niveles por descargar.',
      completedPacks: 0,
      totalPacks: 0,
    })

    return {
      totalPacks: 0,
      downloadedPacks: 0,
      skippedPacks: 0,
    }
  }

  let downloadedPacks = 0
  let skippedPacks = 0

  for (const [index, catalogPack] of manifest.packs.entries()) {
    const existingPack = await getPackById(catalogPack.id)
    const needsDownload =
      !existingPack ||
      existingPack.version < catalogPack.version ||
      existingPack.status !== 'downloaded'

    if (!needsDownload) {
      skippedPacks += 1
      continue
    }

    onProgress({
      mode: 'updating',
      message: `Descargando ${catalogPack.title}...`,
      completedPacks: index,
      totalPacks,
    })

    await downloadPack(catalogPack)

    downloadedPacks += 1

    onProgress({
      mode: 'updating',
      message: `Descargado ${catalogPack.title}`,
      completedPacks: index + 1,
      totalPacks,
    })
  }

  onProgress({
    mode: 'complete',
    message:
      downloadedPacks > 0
        ? `Actualización completa: ${downloadedPacks} pack(s) descargado(s).`
        : 'Todo el contenido ya está actualizado.',
    completedPacks: totalPacks,
    totalPacks,
  })

  return {
    totalPacks,
    downloadedPacks,
    skippedPacks,
  }
}

async function downloadPack(catalogPack: LevelCatalogPack): Promise<void> {
  const now = new Date().toISOString()

  await savePack({
    id: catalogPack.id,
    gameId: catalogPack.gameId,
    title: catalogPack.title,
    version: catalogPack.version,
    status: 'downloading',
    levelCount: catalogPack.levelCount,
    fileUrl: catalogPack.fileUrl,
    checksum: catalogPack.checksum,
    updatedAt: now,
  })

  const packResponse = await fetch(`${catalogPack.fileUrl}?ts=${Date.now()}`, {
    method: 'GET',
    cache: 'no-store',
  })

  if (!packResponse.ok) {
    await savePack({
      id: catalogPack.id,
      gameId: catalogPack.gameId,
      title: catalogPack.title,
      version: catalogPack.version,
      status: 'error',
      levelCount: catalogPack.levelCount,
      fileUrl: catalogPack.fileUrl,
      checksum: catalogPack.checksum,
      updatedAt: new Date().toISOString(),
    })

    throw new Error(`Could not download pack ${catalogPack.id}`)
  }

  const packFile = (await packResponse.json()) as LevelPackFile
  const levels = createLocalLevels(catalogPack, packFile)

  await deleteLevelsByPack(catalogPack.id)
  await saveLevels(levels)

  await savePack({
    id: catalogPack.id,
    gameId: catalogPack.gameId,
    title: catalogPack.title,
    version: catalogPack.version,
    status: 'downloaded',
    levelCount: levels.length,
    fileUrl: catalogPack.fileUrl,
    checksum: catalogPack.checksum,
    downloadedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
}

function createLocalLevels(catalogPack: LevelCatalogPack, packFile: LevelPackFile): LocalLevel[] {
  const now = new Date().toISOString()
  const levels = Array.isArray(packFile.levels) ? packFile.levels : []

  return levels.map((level, index) => ({
    id: getLevelId(catalogPack, level, index),
    packId: catalogPack.id,
    gameId: catalogPack.gameId,
    data: level,
    createdAt: now,
  }))
}

function getLevelId(catalogPack: LevelCatalogPack, level: unknown, index: number): string {
  if (
    typeof level === 'object' &&
    level !== null &&
    'id' in level &&
    typeof level.id === 'string'
  ) {
    return level.id
  }

  return `${catalogPack.id}-${String(index + 1).padStart(4, '0')}`
}
