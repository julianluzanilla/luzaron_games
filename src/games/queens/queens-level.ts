import type { LocalLevel } from '../../core/db-types'
import type { QueensBoardState, QueensCell, QueensLevelData, QueensPosition } from './queens-types'

export function isQueensLevel(level: LocalLevel): boolean {
  return level.gameId === 'queens' && parseQueensLevelData(level) !== null
}

export function createQueensBoardState(level: LocalLevel): QueensBoardState {
  const data = parseQueensLevelData(level)

  if (!data) {
    throw new Error(`Invalid Queens level: ${level.id}`)
  }

  const cells: QueensCell[][] = Array.from({ length: data.size }, (_, row) =>
    Array.from({ length: data.size }, (_, column) => ({
      row,
      column,
      regionId: data.regions[row]?.[column] ?? `region-${row}`,
      value: 'empty',
    }))
  )

  return {
    levelId: data.id,
    size: data.size,
    title: data.title,
    cells,
    solution: data.solution,
    hintsUsed: 0,
    isCompleted: false,
  }
}

export function parseQueensLevelData(level: LocalLevel): QueensLevelData | null {
  const data = level.data

  if (typeof data !== 'object' || data === null) return null

  const raw = data as Partial<QueensLevelData>

  if (typeof raw.id !== 'string') return null
  if (typeof raw.number !== 'number') return null
  if (typeof raw.size !== 'number') return null
  if (typeof raw.title !== 'string') return null
  if (!isValidRegions(raw.regions, raw.size)) return null
  if (!isValidSolution(raw.solution, raw.size)) return null

  return {
    id: raw.id,
    number: raw.number,
    size: raw.size,
    title: raw.title,
    regions: raw.regions,
    solution: raw.solution,
  }
}

function isValidRegions(regions: unknown, size: number): regions is string[][] {
  if (!Array.isArray(regions)) return false
  if (regions.length !== size) return false

  return regions.every((row) => {
    if (!Array.isArray(row)) return false
    if (row.length !== size) return false

    return row.every((cell) => typeof cell === 'string' && cell.length > 0)
  })
}

function isValidSolution(solution: unknown, size: number): solution is QueensPosition[] {
  if (!Array.isArray(solution)) return false
  if (solution.length !== size) return false

  return solution.every((position) => {
    if (typeof position !== 'object' || position === null) return false

    const candidate = position as Partial<QueensPosition>

    return (
      typeof candidate.row === 'number' &&
      typeof candidate.column === 'number' &&
      candidate.row >= 0 &&
      candidate.row < size &&
      candidate.column >= 0 &&
      candidate.column < size
    )
  })
}
