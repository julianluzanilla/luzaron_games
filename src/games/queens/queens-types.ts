export type QueensCellValue = 'empty' | 'x' | 'queen'

export interface QueensPosition {
  row: number
  column: number
}

export interface QueensLevelData {
  id: string
  number: number
  size: number
  title: string
  regions: string[][]
  solution: QueensPosition[]
}

export interface QueensCell {
  row: number
  column: number
  regionId: string
  value: QueensCellValue
}

export interface QueensBoardState {
  levelId: string
  size: number
  title: string
  cells: QueensCell[][]
  solution: QueensPosition[]
  hintsUsed: number
  isCompleted: boolean
}
