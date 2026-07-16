import type { LocalLevel } from '../core/db-types'
import { getLevelNumber } from './level-helpers'

export interface NextPuzzleResult {
  currentLevel: LocalLevel | undefined
  nextLevel: LocalLevel | undefined
  currentIndex: number
  totalLevels: number
  canGoNext: boolean
}

export function getSortedLevels(levels: LocalLevel[]): LocalLevel[] {
  return [...levels].sort((a, b) => {
    const numberDiff = getLevelNumber(a) - getLevelNumber(b)

    if (numberDiff !== 0) return numberDiff

    return a.id.localeCompare(b.id)
  })
}

export function getNextPuzzle(levels: LocalLevel[], currentLevelId: string): NextPuzzleResult {
  const sortedLevels = getSortedLevels(levels)
  const currentIndex = sortedLevels.findIndex((level) => level.id === currentLevelId)
  const currentLevel = currentIndex >= 0 ? sortedLevels[currentIndex] : undefined
  const nextLevel =
    currentIndex >= 0 && currentIndex < sortedLevels.length - 1
      ? sortedLevels[currentIndex + 1]
      : undefined

  return {
    currentLevel,
    nextLevel,
    currentIndex,
    totalLevels: sortedLevels.length,
    canGoNext: Boolean(nextLevel),
  }
}

export function getPuzzleNumber(levels: LocalLevel[], currentLevelId: string): number {
  const result = getNextPuzzle(levels, currentLevelId)

  if (result.currentIndex < 0) return 0

  return result.currentIndex + 1
}

export function isLastPuzzle(levels: LocalLevel[], currentLevelId: string): boolean {
  return !getNextPuzzle(levels, currentLevelId).canGoNext
}
