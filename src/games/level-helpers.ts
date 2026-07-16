import type { LocalLevel } from '../core/db-types'
import type { LevelSummary } from './game-types'

export function getLevelNumber(level: LocalLevel): number {
  const data = level.data

  if (
    typeof data === 'object' &&
    data !== null &&
    'number' in data &&
    typeof data.number === 'number'
  ) {
    return data.number
  }

  return 0
}

export function getLevelTitle(level: LocalLevel): string {
  const data = level.data

  if (
    typeof data === 'object' &&
    data !== null &&
    'title' in data &&
    typeof data.title === 'string'
  ) {
    return data.title
  }

  const levelNumber = getLevelNumber(level)

  return levelNumber > 0 ? `Nivel ${levelNumber}` : 'Nivel sin título'
}

export function createLevelSummary(level: LocalLevel): LevelSummary {
  return {
    id: level.id,
    packId: level.packId,
    gameId: level.gameId,
    number: getLevelNumber(level),
    title: getLevelTitle(level),
  }
}
