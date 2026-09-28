/**
 * Dibujo del tablero de Zip en SVG (design_handoff_zip/README.md).
 *
 * Todo se dibuja en unidades de celda: cada celda mide 100 en el viewBox, así
 * que los grosores del handoff (trazo 0.50c, muro 0.22c, número 0.64c…) son
 * números fijos y el tablero escala solo a 5×5, 6×6 y 7×7.
 *
 * Handoff "Zip con balón" (design_handoff_zip_balon): fondo de cancha
 * (franjas por columna, línea media y círculo central), trazo con esquinas y
 * extremos redondos, números en círculo de Ø0.64c y un **balón** en la punta
 * del trazo, del mismo diámetro que los números.
 *
 * Capas, de abajo arriba: cancha → rejilla y líneas de cancha → celda de
 * pista → trazo → muros → números → balón. El balón vive en su propio SVG
 * encima (ver `renderZipBallLayer`): así no se reemplaza en cada paso y puede
 * deslizarse de celda a celda con una transición CSS.
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

  // Cancha: una franja por columna, alternando los dos verdes.
  for (let column = 0; column < size; column += 1) {
    const stripe = column % 2 === 0 ? 'zip-stripe-a' : 'zip-stripe-b'
    parts.push(`<rect class="${stripe}" x="${column * C}" y="0" width="${C}" height="${extent}"/>`)
  }

  // Rejilla de 1px y líneas de cancha de 1.5px reales, sin importar la escala.
  let grid = ''
  for (let i = 1; i < size; i += 1) grid += `M${i * C} 0V${extent}M0 ${i * C}H${extent}`
  const middle = extent / 2
  parts.push(
    `<path class="zip-grid" d="${grid}"/>`,
    `<path class="zip-field-line" d="M0 ${middle}H${extent}"/>`,
    `<circle class="zip-field-line" cx="${middle}" cy="${middle}" r="${0.9 * C}"/>`
  )

  if (view.hintCell !== null) {
    const x = columnOf(size, view.hintCell) * C
    const y = rowOf(size, view.hintCell) * C
    parts.push(
      `<rect class="zip-hint" x="${x + 6}" y="${y + 6}" width="${C - 12}" height="${C - 12}" rx="14"/>`
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
    trail += `<circle cx="${x}" cy="${y}" r="25" style="fill:${mix(0)}"/>`
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

  // Números: círculo r = 0.32c (niños 0.36c) con anillo de 0.06c del color
  // de la cancha, dígito Archivo 800 a 0.36c (niños 0.42c).
  const radius = numberRadius(size)
  const font = kids ? 42 : 36
  let numbersSvg = ''
  numbers.forEach((cell, index) => {
    const [x, y] = center(size, cell)
    const error = cell === view.errorNumber ? ' is-error' : ''
    numbersSvg +=
      `<g class="zip-number${error}">` +
      (error ? `<circle class="zip-number-halo" cx="${x}" cy="${y}" r="${radius + 10}"/>` : '') +
      `<circle cx="${x}" cy="${y}" r="${radius}"/>` +
      `<text x="${x}" y="${y + 1}" font-size="${font}">${index + 1}</text></g>`
  })
  parts.push(`<g>${numbersSvg}</g>`)

  return `
    <svg class="zip-svg" viewBox="0 0 ${extent} ${extent}" role="img"
         aria-label="Tablero Zip de ${size} por ${size}">${parts.join('')}</svg>
  `
}

/** Radio de números y balón: 0.32c, o 0.36c en el tablero de niños. */
function numberRadius(size: number): number {
  return size === 5 ? 36 : 32
}

/* ---------------------------------------------------------------------- */
/* Balón                                                                   */
/* ---------------------------------------------------------------------- */

/**
 * Balón de fútbol centrado en el origen (zip-balon.ts del handoff): aro
 * exterior de 0.1r del color de la cancha, cuerpo negro y, recortado a
 * r × 0.84, un pentágono negro al centro rodeado de 5 hexágonos blancos con
 * costura negra de 0.1r. El aro va por clase para que pase a rojo en error.
 */
function ballSvg(r: number): string {
  const ink = '#201e1d'
  const point = (radius: number, degrees: number): string => {
    const angle = (degrees * Math.PI) / 180
    return `${(radius * Math.cos(angle)).toFixed(2)},${(radius * Math.sin(angle)).toFixed(2)}`
  }

  let svg =
    `<circle class="zip-ball-ring" r="${r * 1.1}"/>` +
    `<circle r="${r}" fill="${ink}"/>` +
    `<clipPath id="zip-ball-clip"><circle r="${r * 0.84}"/></clipPath>` +
    `<g clip-path="url(#zip-ball-clip)">`

  const inner = r * 0.34
  for (let k = 0; k < 5; k += 1) {
    const m = -90 + 36 + 72 * k
    const points = [
      point(inner, m - 36),
      point(inner, m + 36),
      point(r * 0.66, m + 31),
      point(r * 1.02, m + 15),
      point(r * 1.02, m - 15),
      point(r * 0.66, m - 31),
    ].join(' ')
    svg += `<polygon points="${points}" fill="#ffffff" stroke="${ink}" stroke-width="${r * 0.1}" stroke-linejoin="round"/>`
  }

  return svg + '</g>'
}

/**
 * Capa del balón: un SVG con el mismo viewBox que el tablero, encima de él.
 * El balón se dibuja en el origen y se coloca con `transform` (ver
 * `zipBallTransform`), que es lo que anima la transición de 90 ms.
 */
export function renderZipBallLayer(puzzle: ZipPuzzle, view: ZipBoardView): string {
  const extent = puzzle.size * C
  const ball = zipBallState(puzzle, view)

  return `
    <svg class="zip-ball-layer" viewBox="0 0 ${extent} ${extent}" aria-hidden="true">
      <g class="zip-ball ${ball.visible ? '' : 'is-hidden'} ${ball.error ? 'is-error' : ''}"
         data-zip-ball style="transform:${ball.transform}">
        <g class="zip-ball-body">${ballSvg(numberRadius(puzzle.size))}</g>
      </g>
    </svg>
  `
}

export interface ZipBallState {
  visible: boolean
  error: boolean
  transform: string
}

/** Dónde va el balón: en la punta del trazo, oculto sin trazo o ya resuelto. */
export function zipBallState(puzzle: ZipPuzzle, view: ZipBoardView): ZipBallState {
  const tip = view.path[view.path.length - 1]
  const visible = !view.solved && tip !== undefined
  const [x, y] = tip === undefined ? [0, 0] : center(puzzle.size, tip)

  return { visible, error: view.tipError, transform: `translate(${x}px, ${y}px)` }
}

/* ---------------------------------------------------------------------- */
/* Ilustraciones de "Cómo se juega"                                        */
/* ---------------------------------------------------------------------- */

/** "Conecta los puntos en orden": 1-2-3 unidos. */
export const HOWTO_ORDER_SVG = `
<svg viewBox="0 0 104 36" width="104" height="36" aria-hidden="true" class="zip-howto-art">
  <line x1="18" y1="18" x2="52" y2="18" stroke-width="12" stroke-linecap="round"
        style="stroke:var(--zip-path-start)"/>
  <line x1="52" y1="18" x2="86" y2="18" stroke-width="12" stroke-linecap="round"
        style="stroke:var(--zip-path-end)"/>
  <g class="zip-howto-num">
    <circle cx="18" cy="18" r="12"/><text x="18" y="19">1</text>
    <circle cx="52" cy="18" r="12"/><text x="52" y="19">2</text>
    <circle cx="86" cy="18" r="12"/><text x="86" y="19">3</text>
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
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="10" stroke-linecap="round" ` +
      `style="stroke:color-mix(in srgb, var(--zip-path-end) ${percent}%, var(--zip-path-start))"/>`
  }

  return `
<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true" class="zip-howto-art">
  <rect x="1" y="1" width="62" height="62" style="fill:var(--zip-stripe-a);stroke:var(--zip-frame)" stroke-width="2"/>
  <path d="M22 2V62M42 2V62M2 22H62M2 42H62" style="stroke:var(--zip-grid)"/>
  ${lines}
</svg>`
})()
