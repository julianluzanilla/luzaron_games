/**
 * Dibujo del tablero.
 *
 * Las fichas van posicionadas en píxeles sobre un lienzo de tamaño fijo; la
 * pantalla se encarga de escalarlo con un transform para que quepa.
 *
 * El volumen de la ficha asoma hacia la izquierda y hacia abajo (15 de 100 en
 * el viewBox), así que cada nivel se desplaza arriba y a la DERECHA tanto como
 * ese grosor. La profundidad se lee por la sombra que cada ficha proyecta
 * abajo-izquierda sobre el piso inferior (ver .mahjong-tile en style.css).
 */

import { isFree } from './mahjong-engine'
import type { MahjongBoardState, MahjongTile } from './mahjong-types'

/** Ancho de la cara en píxeles del lienzo interno. */
export const FACE_W = 50
export const FACE_H = 70
/** Grosor del falso 3D: 15 unidades de viewBox sobre una cara de 100. */
export const TILE_Z = 7.5

const VIEWBOX = '0 0 115 155'

export interface BoardMetrics {
  width: number
  height: number
}

export function measureBoard(board: MahjongBoardState): BoardMetrics {
  const lift = Math.max(0, board.depth - 1) * TILE_Z

  return {
    width: (board.width * FACE_W) / 2 + TILE_Z + lift,
    height: (board.height * FACE_H) / 2 + TILE_Z + lift,
  }
}

export interface BoardView {
  selected: number | null
  hinted: Set<number>
  matched: Set<number>
  invalid: Set<number>
  highlightFree: boolean
}

/**
 * Orden de pintado: por nivel, y dentro del nivel de arriba-derecha hacia
 * abajo-izquierda. Así la cara de cada ficha tapa el canto izquierdo de su
 * vecina de la derecha y el canto inferior de la de arriba, también en las
 * filas montadas a media ficha de la tortuga.
 */
function paintOrder(a: MahjongTile, b: MahjongTile): number {
  if (a.slot.z !== b.slot.z) return a.slot.z - b.slot.z
  const da = a.slot.y - a.slot.x
  const db = b.slot.y - b.slot.x
  if (da !== db) return da - db
  return a.slot.y - b.slot.y
}

export function renderMahjongBoard(board: MahjongBoardState, view: BoardView): string {
  const metrics = measureBoard(board)
  const lift = Math.max(0, board.depth - 1) * TILE_Z

  const visible = board.tiles.filter((tile) => !tile.removed || view.matched.has(tile.index))
  const ordered = visible.slice().sort(paintOrder)

  const pieces = ordered
    .map((tile, order) => {
      const left = (tile.slot.x * FACE_W) / 2 + tile.slot.z * TILE_Z
      const top = lift + (tile.slot.y * FACE_H) / 2 - tile.slot.z * TILE_Z

      const classes = ['mahjong-tile']

      if (view.selected === tile.index) classes.push('is-selected')
      if (view.hinted.has(tile.index)) classes.push('is-hinted')
      if (view.matched.has(tile.index)) classes.push('is-matched')
      if (view.invalid.has(tile.index)) classes.push('is-invalid')
      if (view.highlightFree && !isFree(board, tile)) classes.push('is-blocked')

      // El z-index sigue el orden de pintado. La seleccionada ya no se sube por
      // encima de sus vecinas: se marca tiñendo su cara, no levantándola.
      return `
        <button
          type="button"
          class="${classes.join(' ')}"
          style="left:${left}px;top:${top}px;z-index:${order + 1}"
          data-action="mahjong-tile"
          data-index="${tile.index}"
          aria-label="${tile.face.name}"
        >
          <svg viewBox="${VIEWBOX}" aria-hidden="true" focusable="false"><use href="#mj-${tile.face.id}"></use></svg>
        </button>
      `
    })
    .join('')

  return `
    <div class="mahjong-stage" data-stage>
      <div
        class="mahjong-canvas"
        data-canvas
        style="width:${metrics.width}px;height:${metrics.height}px"
      >${pieces}</div>
    </div>
  `
}
