/**
 * Tipos y constantes compartidas por Zip.
 *
 * El tablero es N×N y las celdas se numeran en un arreglo plano
 * (`index = fila * N + columna`). Un muro vive en una **arista** entre dos
 * celdas vecinas y se identifica con la celda de arriba/izquierda más la
 * dirección: `celda * 2` es la arista derecha y `celda * 2 + 1` la de abajo.
 * Así cada arista interior tiene un solo id.
 */

export type ZipSize = 5 | 6 | 7

export const ZIP_SIZES: ZipSize[] = [5, 6, 7]

export const SIZE_LABELS: Record<ZipSize, string> = {
  5: '5×5',
  6: '6×6',
  7: '7×7',
}

export interface ZipPuzzle {
  size: ZipSize
  /** Celda de cada número, en orden: `numbers[0]` es el 1 y el último es K. */
  numbers: number[]
  /** Aristas bloqueadas (ver arriba). */
  walls: number[]
  /** La única solución: las N² celdas en orden, empieza en el 1 y termina en K. */
  solution: number[]
  /** Puntaje de dificultad 0–100 (solo para ordenar el pack). */
  score: number
}

/** Rangos de números y muros por tamaño (zip-decisiones.md). */
export interface ZipSizeRules {
  minNumbers: number
  maxNumbers: number
  maxWalls: number
}

export const SIZE_RULES: Record<ZipSize, ZipSizeRules> = {
  5: { minNumbers: 6, maxNumbers: 10, maxWalls: 3 },
  6: { minNumbers: 6, maxNumbers: 12, maxWalls: 6 },
  7: { minNumbers: 7, maxNumbers: 14, maxWalls: 10 },
}

/* ---------------------------------------------------------------------- */
/* Geometría                                                               */
/* ---------------------------------------------------------------------- */

export function rowOf(size: number, cell: number): number {
  return Math.floor(cell / size)
}

export function columnOf(size: number, cell: number): number {
  return cell % size
}

/** Id de la arista entre dos celdas vecinas, o -1 si no son vecinas. */
export function edgeBetween(size: number, a: number, b: number): number {
  const low = Math.min(a, b)
  const high = Math.max(a, b)

  if (high - low === 1 && rowOf(size, low) === rowOf(size, high)) return low * 2
  if (high - low === size) return low * 2 + 1

  return -1
}

export function areAdjacent(size: number, a: number, b: number): boolean {
  return edgeBetween(size, a, b) !== -1
}

/** Vecinas ortogonales de una celda, sin mirar muros. */
export function neighborsOf(size: number, cell: number): number[] {
  const row = rowOf(size, cell)
  const column = columnOf(size, cell)
  const result: number[] = []

  if (row > 0) result.push(cell - size)
  if (column < size - 1) result.push(cell + 1)
  if (row < size - 1) result.push(cell + size)
  if (column > 0) result.push(cell - 1)

  return result
}

/** Vecinas a las que se puede pasar: sin muro de por medio. */
export function openNeighbors(size: number, walls: Set<number>): number[][] {
  const result: number[][] = []

  for (let cell = 0; cell < size * size; cell += 1) {
    result.push(
      neighborsOf(size, cell).filter((other) => !walls.has(edgeBetween(size, cell, other)))
    )
  }

  return result
}

/* ---------------------------------------------------------------------- */
/* Formato guardado (public/levels/zip/)                                   */
/* ---------------------------------------------------------------------- */

/**
 * Formato compacto de un puzzle en el pack:
 * - `nums`: celdas de los números en orden.
 * - `walls`: ids de arista.
 * - `path`: la solución como direcciones desde el 1 (`R`, `L`, `U`, `D`).
 */
export interface StoredZipPuzzle {
  nums: number[]
  walls: number[]
  path: string
  score: number
}

export interface StoredZipPack {
  size: ZipSize
  puzzles: StoredZipPuzzle[]
}

export interface ZipPackEntry {
  size: ZipSize
  count: number
}

export interface ZipPackIndex {
  packs: ZipPackEntry[]
}

export function pathToDirections(size: number, path: number[]): string {
  let result = ''

  for (let i = 1; i < path.length; i += 1) {
    const delta = path[i] - path[i - 1]

    if (delta === 1) result += 'R'
    else if (delta === -1) result += 'L'
    else if (delta === size) result += 'D'
    else result += 'U'
  }

  return result
}

export function directionsToPath(size: number, start: number, directions: string): number[] {
  const path = [start]
  let cell = start

  for (const step of directions) {
    if (step === 'R') cell += 1
    else if (step === 'L') cell -= 1
    else if (step === 'D') cell += size
    else cell -= size

    path.push(cell)
  }

  return path
}

export function toStoredZipPuzzle(puzzle: ZipPuzzle): StoredZipPuzzle {
  return {
    nums: puzzle.numbers.slice(),
    walls: puzzle.walls.slice().sort((a, b) => a - b),
    path: pathToDirections(puzzle.size, puzzle.solution),
    score: puzzle.score,
  }
}

export function toZipPuzzle(size: ZipSize, stored: StoredZipPuzzle): ZipPuzzle {
  return {
    size,
    numbers: stored.nums.slice(),
    walls: stored.walls.slice(),
    solution: directionsToPath(size, stored.nums[0], stored.path),
    score: stored.score,
  }
}
