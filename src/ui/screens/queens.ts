import type { LocalLevel } from '../../core/db-types'
import { applyQueensCellCycle } from '../../games/queens/queens-engine'
import { createQueensBoardState, isQueensLevel } from '../../games/queens/queens-level'
import { renderQueensBoard } from '../../games/queens/queens-board-renderer'
import type { QueensBoardState } from '../../games/queens/queens-types'

let activeQueensBoard: QueensBoardState | null = null
let activeQueensLevelId: string | null = null

export function renderQueensScreen(levels: LocalLevel[]): string {
  const queensLevels = levels.filter(isQueensLevel)
  const firstLevel = queensLevels[0]

  if (!firstLevel) {
    return `
      <section class="screen content-screen">
        <div class="section-header">
          <p class="eyebrow">Queens</p>
          <h1>Queens</h1>
          <p>
            Descarga un pack de Queens desde Biblioteca para empezar a jugar.
          </p>
        </div>
      </section>
    `
  }

  const board = getActiveQueensBoard(firstLevel)

  return `
    <section class="screen game-screen">
      <div class="game-header">
        <div>
          <p class="eyebrow">Queens</p>
          <h1>${board.title}</h1>
          <p>
            Haz clic en una celda para alternar entre vacío, X y reina.
          </p>
        </div>

        <div class="game-meta">
          <span>${board.size}x${board.size}</span>
          <span>${queensLevels.length} nivel(es) descargado(s)</span>
        </div>
      </div>

      <div class="queens-stage">
        ${renderQueensBoard(board)}
      </div>
    </section>
  `
}

export function applyQueensCellClick(row: number, column: number): boolean {
  if (!activeQueensBoard) return false

  activeQueensBoard = applyQueensCellCycle(activeQueensBoard, row, column)

  return true
}

function getActiveQueensBoard(level: LocalLevel): QueensBoardState {
  if (!activeQueensBoard || activeQueensLevelId !== level.id) {
    activeQueensBoard = createQueensBoardState(level)
    activeQueensLevelId = level.id
  }

  return activeQueensBoard
}
