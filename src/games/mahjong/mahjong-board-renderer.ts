/**
 * Dibujo del tablero.
 *
 * Las fichas van posicionadas en píxeles sobre un lienzo de tamaño fijo; la
 * pantalla se encarga de escalarlo con un transform para que quepa.
 *
 * Fichas planas (rediseño Modernist): la ficha es solo su cara. Cada nivel
 * superior se desplaza hacia arriba y a la IZQUIERDA y proyecta una sombra
 * dura abajo-derecha (ver .mahjong-tile.is-raised en style.css).
 */

import { isFree } from './mahjong-engine'
import type { MahjongBoardState, MahjongTile } from './mahjong-types'

/** Ancho de la cara en píxeles del lienzo interno. */
export const FACE_W = 50
export const FACE_H = 70
/** Desplazamiento de cada nivel (−4px sobre una ficha de 32 en el handoff). */
export const LAYER_SHIFT = 6
/** Aire del sprite a la izquierda de la cara: 15 de 115 unidades de viewBox. */
const SPRITE_LEFT = 7.5
/** Margen para la sombra dura de las fichas levantadas. */
const SHADOW = 5

const VIEWBOX = '0 0 115 155'

export interface BoardMetrics {
  width: number
  height: number
}

export function measureBoard(board: MahjongBoardState): BoardMetrics {
  const lift = Math.max(0, board.depth - 1) * LAYER_SHIFT

  return {
    width: (board.width * FACE_W) / 2 + lift + SHADOW,
    height: (board.height * FACE_H) / 2 + lift + SHADOW,
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
 * Orden de pintado: por nivel, y dentro del nivel de arriba-izquierda hacia
 * abajo-derecha. Así la sombra de cada ficha cae sobre el piso de abajo y la
 * vecina de la derecha, pintada después, la tapa.
 */
function paintOrder(a: MahjongTile, b: MahjongTile): number {
  if (a.slot.z !== b.slot.z) return a.slot.z - b.slot.z
  if (a.slot.y !== b.slot.y) return a.slot.y - b.slot.y
  return a.slot.x - b.slot.x
}

export function renderMahjongBoard(board: MahjongBoardState, view: BoardView): string {
  const metrics = measureBoard(board)
  const lift = Math.max(0, board.depth - 1) * LAYER_SHIFT

  const visible = board.tiles.filter((tile) => !tile.removed || view.matched.has(tile.index))
  const ordered = visible.slice().sort(paintOrder)

  const pieces = ordered
    .map((tile, order) => {
      const left = lift + (tile.slot.x * FACE_W) / 2 - tile.slot.z * LAYER_SHIFT - SPRITE_LEFT
      const top = lift + (tile.slot.y * FACE_H) / 2 - tile.slot.z * LAYER_SHIFT

      const classes = ['mahjong-tile']

      if (tile.slot.z > 0) classes.push('is-raised')

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
