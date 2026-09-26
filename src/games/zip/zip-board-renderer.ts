/**
 * Dibujo del tablero de Zip en SVG (design_handoff_zip/README.md).
 *
 * Todo se dibuja en unidades de celda: cada celda mide 100 en el viewBox, así
 * que los grosores del handoff (trazo 0.50c, muro 0.22c, número 0.64c…) son
 * números fijos y el tablero escala solo a 5×5, 6×6 y 7×7.
 *
 * Rediseño Modernist: remates cuadrados en trazo y muros, números en cuadros
 * de 0.64c en tinta y la punta es un cuadro de 0.60c.
 *
 * Capas, de abajo arriba: papel → rejilla → celda de pista → trazo → muros →
 * punta → números.
 *
 * El color del trazo va por segmento: el segmento i mezcla inicio y fin en
 * i / (N² − 1), así el degradado avanza igual en progreso y resuelto. Los
 * colores salen de variables CSS (`--zip-trail-*`), que cambian con el tema y
 * con la clase `is-solved`; por eso no hay un solo hex aquí.
 */

import { rowOf, columnOf, type ZipPuzzle } from './zip-types'

const C = 100

export interface ZipBoardView {
  path: number[]
  hintCell: number | null
  solved: boolean
  /** Arista del muro contra el que se chocó, para pintarlo en rojo. */
  errorWall: number | null
  /** Celda del número que llegó fuera de orden. */
  errorNumber: number | null
  /** La punta también va en rojo mientras dura el aviso. */
  tipError: boolean
}

function center(size: number, cell: number): [number, number] {
  return [columnOf(size, cell) * C + C / 2, rowOf(size, cell) * C + C / 2]
}

function mix(fraction: number): string {
  const percent = Math.round(Math.max(0, Math.min(1, fraction)) * 1000) / 10
  return `color-mix(in srgb, var(--zip-trail-end) ${percent}%, var(--zip-trail-start))`
}

function wallLine(size: number, edge: number): [number, number, number, number] {
  const cell = edge >> 1
  const row = rowOf(size, cell)
  const column = columnOf(size, cell)

  // Arista derecha: vertical sobre x = (columna + 1)·C. Abajo: horizontal.
  return edge % 2 === 0
    ? [(column + 1) * C, row * C, (column + 1) * C, (row + 1) * C]
    : [column * C, (row + 1) * C, (column + 1) * C, (row + 1) * C]
}

export function renderZipBoardSvg(puzzle: ZipPuzzle, view: ZipBoardView): string {
  const { size, numbers, walls } = puzzle
  const extent = size * C
  const kids = size === 5
  const denominator = size * size - 1
  const parts: string[] = []

  // Rejilla: líneas interiores de 1px reales, sin importar la escala.
  let grid = ''
  for (let i = 1; i < size; i += 1) grid += `M${i * C} 0V${extent}M0 ${i * C}H${extent}`
  parts.push(
    `<rect class="zip-paper" x="0" y="0" width="${extent}" height="${extent}"/>`,
    `<path class="zip-grid" d="${grid}"/>`
  )

  if (view.hintCell !== null) {
    const x = columnOf(size, view.hintCell) * C
    const y = rowOf(size, view.hintCell) * C
    parts.push(
      `<rect class="zip-hint" x="${x + 6}" y="${y + 6}" width="${C - 12}" height="${C - 12}"/>`
    )
  }

  // Trazo por segmentos, cada uno con su color.
  const { path } = view
  let trail = ''
  for (let i = 1; i < path.length; i += 1) {
    const [x1, y1] = center(size, path[i - 1])
    const [x2, y2] = center(size, path[i])
    trail += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="stroke:${mix(i / denominator)}"/>`
  }
  if (path.length === 1) {
    const [x, y] = center(size, path[0])
    trail += `<rect x="${x - 25}" y="${y - 25}" width="50" height="50" style="fill:${mix(0)}"/>`
  }
  parts.push(`<g class="zip-trail">${trail}</g>`)

  let wallsSvg = ''
  for (const edge of walls) {
    const [x1, y1, x2, y2] = wallLine(size, edge)
    if (edge === view.errorWall) {
      wallsSvg += `<line class="zip-wall-halo" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`
      wallsSvg += `<line class="zip-wall is-error" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`
    } else {
      wallsSvg += `<line class="zip-wall" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`
    }
  }
  parts.push(`<g>${wallsSvg}</g>`)

  // La punta solo existe mientras se juega: es lo que distingue "en
  // progreso" de "resuelto" además del color.
  if (!view.solved && path.length > 0) {
    const tip = path[path.length - 1]
    const [x, y] = center(size, tip)
    const color = mix((path.length - 1) / denominator)
    const error = view.tipError ? ' is-error' : ''
    parts.push(
      `<g class="zip-tip${error}">` +
        `<rect class="zip-tip-halo" x="${x - 44}" y="${y - 44}" width="88" height="88" style="fill:${color}"/>` +
        `<rect class="zip-tip-dot" x="${x - 30}" y="${y - 30}" width="60" height="60" style="fill:${color}"/>` +
        `</g>`
    )
  }

  const half = kids ? 36 : 32
  const font = kids ? 42 : 36
  let numbersSvg = ''
  numbers.forEach((cell, index) => {
    const [x, y] = center(size, cell)
    const error = cell === view.errorNumber ? ' is-error' : ''
    numbersSvg +=
      `<g class="zip-number${error}">` +
      (error
        ? `<rect class="zip-number-halo" x="${x - half - 10}" y="${y - half - 10}" width="${2 * (half + 10)}" height="${2 * (half + 10)}"/>`
        : '') +
      `<rect x="${x - half}" y="${y - half}" width="${2 * half}" height="${2 * half}"/>` +
      `<text x="${x}" y="${y + 1}" font-size="${font}">${index + 1}</text></g>`
  })
  parts.push(`<g>${numbersSvg}</g>`)

  return `
    <svg class="zip-svg" viewBox="0 0 ${extent} ${extent}" role="img"
         aria-label="Tablero Zip de ${size} por ${size}">${parts.join('')}</svg>
  `
}

/* ---------------------------------------------------------------------- */
/* Ilustraciones de "Cómo se juega"                                        */
/* ---------------------------------------------------------------------- */

/** "Conecta los puntos en orden": 1-2-3 unidos. */
export const HOWTO_ORDER_SVG = `
<svg viewBox="0 0 104 36" width="104" height="36" aria-hidden="true" class="zip-howto-art">
  <line x1="18" y1="18" x2="52" y2="18" stroke-width="12" stroke-linecap="square"
        style="stroke:var(--zip-path-start)"/>
  <line x1="52" y1="18" x2="86" y2="18" stroke-width="12" stroke-linecap="square"
        style="stroke:var(--zip-path-end)"/>
  <g class="zip-howto-num">
    <rect x="6" y="6" width="24" height="24"/><text x="18" y="19">1</text>
    <rect x="40" y="6" width="24" height="24"/><text x="52" y="19">2</text>
    <rect x="74" y="6" width="24" height="24"/><text x="86" y="19">3</text>
  </g>
</svg>`

/** "Pasa por cada celda": una serpiente en una rejilla de 3×3. */
export const HOWTO_FILL_SVG = (() => {
  const points: [number, number][] = [
    [12, 12],
    [12, 32],
    [12, 52],
    [32, 52],
    [32, 32],
    [32, 12],
    [52, 12],
    [52, 32],
    [52, 52],
  ]
  let lines = ''
  for (let i = 1; i < points.length; i += 1) {
    const percent = Math.round((i / (points.length - 1)) * 100)
    const [x1, y1] = points[i - 1]
    const [x2, y2] = points[i]
    lines +=
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="10" stroke-linecap="square" ` +
      `style="stroke:color-mix(in srgb, var(--zip-path-end) ${percent}%, var(--zip-path-start))"/>`
  }

  return `
<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true" class="zip-howto-art">
  <rect x="1" y="1" width="62" height="62" style="fill:var(--zip-paper);stroke:var(--board-frame)" stroke-width="2"/>
  <path d="M22 2V62M42 2V62M2 22H62M2 42H62" style="stroke:var(--zip-grid)"/>
  ${lines}
</svg>`
})()
