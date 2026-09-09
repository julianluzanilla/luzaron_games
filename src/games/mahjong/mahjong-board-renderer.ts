/**
 * Dibujo del tablero.
 *
 * Las fichas van posicionadas en píxeles sobre un lienzo de tamaño fijo; la
 * pantalla se encarga de escalarlo con un transform para que quepa. Cada
 * nivel se desplaza arriba y a la izquierda tanto como el grosor de la ficha
 * (12 de 100 en el viewBox), que es justo lo que hace que la torre se lea:
 * el canto de la ficha de abajo asoma por la derecha y por abajo.
 */

import { isFree } from './mahjong-engine'
import type { MahjongBoardState } from './mahjong-types'

/** Ancho de la cara en píxeles del lienzo interno. */
export const FACE_W = 50
export const FACE_H = 70
/** Grosor del falso 3D: 12 unidades de viewBox sobre una cara de 100. */
export const TILE_Z = 6

const SVG_W = FACE_W * 1.12
const SVG_H = FACE_H * (152 / 140)

export interface BoardMetrics {
  width: number
  height: number
}

export function measureBoard(board: MahjongBoardState): BoardMetrics {
  const lift = Math.max(0, board.depth - 1) * TILE_Z

  return {
    width: (board.width * FACE_W) / 2 + (SVG_W - FACE_W) + lift,
    height: (board.height * FACE_H) / 2 + (SVG_H - FACE_H) + lift,
  }
}

export interface BoardView {
  selected: number | null
  hinted: Set<number>
  matched: Set<number>
  invalid: Set<number>
  highlightFree: boolean
}

export function renderMahjongBoard(board: MahjongBoardState, view: BoardView): string {
  const metrics = measureBoard(board)
  const lift = Math.max(0, board.depth - 1) * TILE_Z

  const visible = board.tiles.filter((tile) => !tile.removed || view.matched.has(tile.index))

  const ordered = visible.slice().sort((a, b) => {
    if (a.slot.z !== b.slot.z) return a.slot.z - b.slot.z
    if (a.slot.y !== b.slot.y) return a.slot.y - b.slot.y
    return a.slot.x - b.slot.x
  })

  const pieces = ordered
    .map((tile) => {
      const left = lift + (tile.slot.x * FACE_W) / 2 - tile.slot.z * TILE_Z
      const top = lift + (tile.slot.y * FACE_H) / 2 - tile.slot.z * TILE_Z
      // La seleccionada y la pareja de la pista se suben por encima de sus
      // vecinas para que el halo no quede tapado por el canto de al lado.
      const lifted = view.selected === tile.index || view.hinted.has(tile.index)
      const depth = tile.slot.z * 1000 + tile.slot.y * 30 + tile.slot.x + (lifted ? 100000 : 0)

      const classes = ['mahjong-tile']

      if (view.selected === tile.index) classes.push('is-selected')
      if (view.hinted.has(tile.index)) classes.push('is-hinted')
      if (view.matched.has(tile.index)) classes.push('is-matched')
      if (view.invalid.has(tile.index)) classes.push('is-invalid')
      if (view.highlightFree && !isFree(board, tile)) classes.push('is-blocked')

      return `
        <button
          type="button"
          class="${classes.join(' ')}"
          style="left:${left}px;top:${top}px;z-index:${depth}"
          data-action="mahjong-tile"
          data-index="${tile.index}"
          aria-label="${tile.face.name}"
        >
          <svg viewBox="0 0 112 152" aria-hidden="true" focusable="false"><use href="#mj-${tile.face.id}"></use></svg>
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
