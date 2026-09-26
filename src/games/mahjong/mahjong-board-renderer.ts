/**
 * Dibujo del tablero.
 *
 * Las fichas van posicionadas en píxeles sobre un lienzo de tamaño fijo; la
 * pantalla se encarga de escalarlo con un transform para que quepa.
 *
 * Niveles legibles (design_handoff_mahjong_3a): cada ficha es un bloque con
 * canto verde a la izquierda y canto naranja abajo (vienen en el sprite). Cada
 * nivel superior se desplaza hacia arriba y a la DERECHA exactamente lo que
 * mide el canto, así la altura se lee como escalones, y proyecta una sombra
 * hacia arriba-derecha sobre las fichas de abajo (ver .mahjong-shadow en
 * style.css).
 */

import { isFree } from './mahjong-engine'
import type { MahjongBoardState, MahjongTile } from './mahjong-types'

/** Ancho de la cara en píxeles del lienzo interno. */
export const FACE_W = 50
export const FACE_H = 70
/** Desplazamiento de cada nivel = grosor del canto (4px sobre cara de 30 en el diseño). */
export const LAYER_SHIFT = 7
/** Aire del sprite a la izquierda de la cara: 15 de 115 unidades de viewBox. */
const SPRITE_LEFT = 7.5
/** Canto izquierdo e inferior en px (14 u del viewBox). */
const SIDE = 7
/** Alcance de la sombra arriba-derecha. */
const SHADOW = 12

const VIEWBOX = '0 0 115 155'

export interface BoardMetrics {
  width: number
  height: number
}

export function measureBoard(board: MahjongBoardState): BoardMetrics {
  const lift = Math.max(0, board.depth - 1) * LAYER_SHIFT

  return {
    width: SIDE + (board.width * FACE_W) / 2 + lift + SHADOW,
    height: SHADOW + lift + (board.height * FACE_H) / 2 + SIDE,
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
 * Por nivel; dentro del nivel, por `y − x` y luego por `y`: una ficha se pinta
 * DESPUÉS de las que tiene a su derecha y de las que tiene arriba, así tapa sus
 * cantos (verde a la izquierda, naranja abajo) y solo se ven los de las orillas.
 *
 * Ordenar solo por fila y luego de derecha a izquierda no basta: las fichas
 * montadas a media fila de la Tortuga (la suelta de la izquierda y las dos de
 * la derecha) quedaban entre las filas 6 y 8 de su vecina y el canto de una se
 * dibujaba encima de la cara de la otra. Con `y − x` (coordenadas en medias
 * fichas) la suelta de la izquierda va después de toda su columna vecina y las
 * de la derecha, antes.
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
  const lift = Math.max(0, board.depth - 1) * LAYER_SHIFT

  const visible = board.tiles.filter((tile) => !tile.removed || view.matched.has(tile.index))
  const ordered = visible.slice().sort(paintOrder)

  // Cada nivel se pinta en dos pasadas: primero las sombras de todas sus
  // fichas y luego las fichas. Así la sombra de un nivel cae solo sobre los
  // niveles de abajo y nunca sobre sus vecinas del mismo nivel (ni sobre sus
  // cantos), igual que en el handoff 3a. El z-index sigue ese orden.
  let layer = 0
  const pieces: string[] = []

  const place = (tile: MahjongTile): { left: number; top: number } => ({
    left: SIDE + (tile.slot.x * FACE_W) / 2 + tile.slot.z * LAYER_SHIFT - SPRITE_LEFT,
    top: SHADOW + lift + (tile.slot.y * FACE_H) / 2 - tile.slot.z * LAYER_SHIFT,
  })

  let index = 0
  while (index < ordered.length) {
    const z = ordered[index].slot.z
    let end = index
    while (end < ordered.length && ordered[end].slot.z === z) end += 1
    const level = ordered.slice(index, end)

    if (z > 0) {
      for (const tile of level) {
        if (view.matched.has(tile.index)) continue
        const { left, top } = place(tile)
        layer += 1
        pieces.push(
          `<span class="mahjong-shadow" aria-hidden="true" style="left:${left + SPRITE_LEFT}px;top:${top}px;z-index:${layer}"></span>`
        )
      }
    }

    for (const tile of level) {
      const { left, top } = place(tile)
      const classes = ['mahjong-tile']

      if (tile.slot.z > 0) classes.push('is-raised')
      if (view.selected === tile.index) classes.push('is-selected')
      if (view.hinted.has(tile.index)) classes.push('is-hinted')
      if (view.matched.has(tile.index)) classes.push('is-matched')
      if (view.invalid.has(tile.index)) classes.push('is-invalid')
      if (view.highlightFree && !isFree(board, tile)) classes.push('is-blocked')

      // La seleccionada no se sube por encima de sus vecinas: se marca tiñendo
      // su cara, no levantándola.
      layer += 1
      pieces.push(`
        <button
          type="button"
          class="${classes.join(' ')}"
          style="left:${left}px;top:${top}px;z-index:${layer}"
          data-action="mahjong-tile"
          data-index="${tile.index}"
          aria-label="${tile.face.name}"
        >
          <svg viewBox="${VIEWBOX}" aria-hidden="true" focusable="false"><use href="#mj-${tile.face.id}"></use></svg>
        </button>
      `)
    }

    index = end
  }

  return `
    <div class="mahjong-stage" data-stage>
      <div
        class="mahjong-canvas"
        data-canvas
        style="width:${metrics.width}px;height:${metrics.height}px"
      >${pieces.join('')}</div>
    </div>
  `
}
