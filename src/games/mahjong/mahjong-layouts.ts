/**
 * Layouts del Mahjong Solitario.
 *
 * Las coordenadas van en medias fichas (una ficha ocupa 2×2), que es lo que
 * permite las filas montadas de la tortuga clásica. Cada layout tiene un
 * número par de huecos: si no, sobraría una ficha sin pareja.
 */

import type { MahjongLayout, MahjongLayoutId, MahjongSlot } from './mahjong-types'
import { LAYOUT_LABELS } from './mahjong-types'

/** Fila horizontal de fichas: `from` y `to` en fichas enteras, inclusive. */
function row(y: number, from: number, to: number, z = 0): MahjongSlot[] {
  const slots: MahjongSlot[] = []
  for (let x = from; x <= to; x += 1) slots.push({ x: x * 2, y: y * 2, z })
  return slots
}

/** Bloque rectangular de fichas enteras, inclusive en ambos extremos. */
function block(x0: number, x1: number, y0: number, y1: number, z: number): MahjongSlot[] {
  const slots: MahjongSlot[] = []
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) slots.push({ x: x * 2, y: y * 2, z })
  }
  return slots
}

function buildTortuga(): MahjongSlot[] {
  const slots: MahjongSlot[] = [
    ...row(0, 1, 12),
    ...row(1, 3, 10),
    ...row(2, 2, 11),
    ...row(3, 1, 12),
    ...row(4, 1, 12),
    ...row(5, 2, 11),
    ...row(6, 3, 10),
    ...row(7, 1, 12),
    // La ficha suelta de la izquierda y las dos de la derecha, a media altura.
    { x: 0, y: 7, z: 0 },
    { x: 26, y: 7, z: 0 },
    { x: 28, y: 7, z: 0 },
    ...block(3, 8, 1, 6, 1),
    ...block(4, 7, 2, 5, 2),
    ...block(5, 6, 3, 4, 3),
    // La cima va justo en medio de las cuatro de abajo.
    { x: 11, y: 7, z: 4 },
  ]

  return slots
}

function buildPiramide(): MahjongSlot[] {
  return [
    ...block(0, 7, 0, 7, 0),
    ...block(1, 6, 1, 6, 1),
    ...block(2, 5, 2, 5, 2),
    ...block(3, 4, 3, 4, 3),
  ]
}

function buildJardin(): MahjongSlot[] {
  return [
    ...row(0, 2, 9),
    ...row(1, 1, 10),
    ...row(2, 0, 11),
    ...row(3, 0, 11),
    ...row(4, 1, 10),
    ...row(5, 2, 9),
    ...block(4, 7, 1, 3, 1),
  ]
}

function measure(id: MahjongLayoutId, slots: MahjongSlot[]): MahjongLayout {
  let width = 0
  let height = 0
  let depth = 0

  for (const slot of slots) {
    width = Math.max(width, slot.x + 2)
    height = Math.max(height, slot.y + 2)
    depth = Math.max(depth, slot.z + 1)
  }

  return { id, label: LAYOUT_LABELS[id], width, height, depth, slots }
}

const LAYOUTS: Record<MahjongLayoutId, MahjongLayout> = {
  jardin: measure('jardin', buildJardin()),
  piramide: measure('piramide', buildPiramide()),
  tortuga: measure('tortuga', buildTortuga()),
}

export function getMahjongLayout(id: MahjongLayoutId): MahjongLayout {
  return LAYOUTS[id]
}
