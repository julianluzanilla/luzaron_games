import type { LocalLevel } from '../../core/db-types'
import { createQueensBoardState, isQueensLevel } from '../../games/queens/queens-level'
import { renderQueensBoard } from '../../games/queens/queens-board-renderer'

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

  const board = createQueensBoardState(firstLevel)

  return `
    <section class="screen game-screen">
      <div class="game-header">
        <div>
          <p class="eyebrow">Queens</p>
          <h1>${board.title}</h1>
          <p>
            Primer tablero visual. En el siguiente bloque activaremos los movimientos.
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
