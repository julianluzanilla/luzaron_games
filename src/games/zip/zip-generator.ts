/**
 * Generador de puzzles de Zip.
 *
 * Receta (zip-decisiones.md):
 * 1. Un camino hamiltoniano al azar con **backbite**: se parte de una
 *    serpiente y se "muerde" miles de veces. Cada mordida une una punta con
 *    una vecina y voltea el tramo sobrante, así que el camino sigue pasando
 *    por todas las celdas pero cada vez es más irregular.
 * 2. Números sobre el camino: el 1 en la salida, K en la llegada y muchos
 *    intermedios.
 * 3. Si hay más de una solución se agrega un número donde la alternativa se
 *    separa de la real.
 * 4. Se quitan números al azar mientras la solución siga siendo única,
 *    hasta llegar a la cantidad objetivo. Cuando quitar uno rompe la
 *    unicidad, a veces se cambia por un **muro** en una arista que usa la
 *    alternativa y no la real: los muros nacen solo donde hacen falta.
 * 5. Se califica con `scoreZip` (0–100).
 *
 * Corre igual en el navegador (botón Aleatorio) y en el script de los packs.
 */

import { solveZip } from './zip-solver'
import { SIZE_RULES, edgeBetween, neighborsOf, type ZipPuzzle, type ZipSize } from './zip-types'

export type RandomFn = () => number

/** PRNG determinista, el mismo que usa Sudoku para sus packs. */
export function mulberry32(seed: number): RandomFn {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randomInt(random: RandomFn, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1))
}

function shuffle<T>(items: T[], random: RandomFn): T[] {
  const copy = items.slice()

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }

  return copy
}

/* ---------------------------------------------------------------------- */
/* 1. Camino hamiltoniano                                                  */
/* ---------------------------------------------------------------------- */

/** Serpiente por filas: el punto de partida del backbite. */
function serpentine(size: number): number[] {
  const path: number[] = []

  for (let row = 0; row < size; row += 1) {
    for (let step = 0; step < size; step += 1) {
      const column = row % 2 === 0 ? step : size - 1 - step
      path.push(row * size + column)
    }
  }

  return path
}

/**
 * Una mordida en la punta final: se elige una vecina de la punta que no sea
 * la anterior en el camino, se une a ella y se voltea el tramo que queda
 * después, cuya primera celda pasa a ser la nueva punta.
 */
function backbiteEnd(size: number, path: number[], position: Int16Array, random: RandomFn): void {
  const end = path[path.length - 1]
  const options = neighborsOf(size, end)
  const target = options[Math.floor(random() * options.length)]
  const at = position[target]

  if (at === path.length - 2) return

  // path = path[0..at] + reverse(path[at+1..end])
  let low = at + 1
  let high = path.length - 1
  while (low < high) {
    const swap = path[low]
    path[low] = path[high]
    path[high] = swap
    position[path[low]] = low
    position[path[high]] = high
    low += 1
    high -= 1
  }
}

export function randomHamiltonianPath(size: number, random: RandomFn): number[] {
  const path = serpentine(size)
  const position = new Int16Array(size * size)
  path.forEach((cell, index) => {
    position[cell] = index
  })

  const moves = size * size * 60

  for (let move = 0; move < moves; move += 1) {
    // Morder por la otra punta = voltear el camino y morder por el final.
    if (random() < 0.5) {
      path.reverse()
      path.forEach((cell, index) => {
        position[cell] = index
      })
    }

    backbiteEnd(size, path, position, random)
  }

  return path
}

/* ---------------------------------------------------------------------- */
/* 2–4. Números, unicidad y muros                                          */
/* ---------------------------------------------------------------------- */

/** Números a partir de las posiciones (índices en el camino) elegidas. */
function numbersFrom(solution: number[], positions: Set<number>): number[] {
  return [...positions].sort((a, b) => a - b).map((index) => solution[index])
}

/** Primer índice donde la alternativa se separa de la solución real. */
function divergence(solution: number[], other: number[]): number {
  for (let i = 0; i < solution.length; i += 1) {
    if (solution[i] !== other[i]) return i
  }
  return solution.length
}

/** Aristas del camino real: ahí nunca puede ir un muro. */
function pathEdges(size: number, path: number[]): Set<number> {
  const edges = new Set<number>()
  for (let i = 1; i < path.length; i += 1) edges.add(edgeBetween(size, path[i - 1], path[i]))
  return edges
}

/**
 * Muro que bloquea la alternativa: una arista que la alternativa usa y la
 * real no, cerca de donde se separan (así el muro "explica" la jugada).
 */
function wallAgainst(
  size: number,
  realEdges: Set<number>,
  other: number[],
  from: number,
  random: RandomFn
): number | null {
  const candidates: number[] = []

  for (let i = Math.max(1, from); i < other.length && candidates.length < 4; i += 1) {
    const edge = edgeBetween(size, other[i - 1], other[i])
    if (!realEdges.has(edge)) candidates.push(edge)
  }

  if (candidates.length === 0) return null

  return candidates[Math.floor(random() * candidates.length)]
}

interface Draft {
  positions: Set<number>
  walls: Set<number>
}

const UNIQUE_NODE_LIMIT = 250_000

function isUnique(size: number, solution: number[], draft: Draft): ReturnType<typeof solveZip> {
  return solveZip(
    { size, numbers: numbersFrom(solution, draft.positions), walls: draft.walls },
    2,
    UNIQUE_NODE_LIMIT
  )
}

export interface GenerateOptions {
  size: ZipSize
  random?: RandomFn
  /** Cuántos números quiere el puzzle; por defecto uno al azar del rango del tamaño. */
  targetNumbers?: number
  /** Probabilidad de cambiar un número por un muro cuando hace falta. */
  wallBias?: number
}

function tryGenerate(options: GenerateOptions, random: RandomFn): ZipPuzzle | null {
  const { size } = options
  const rules = SIZE_RULES[size]
  const total = size * size
  const target = options.targetNumbers ?? randomInt(random, rules.minNumbers, rules.maxNumbers)
  const wallBias = options.wallBias ?? 0.2 + random() * 0.5

  const solution = randomHamiltonianPath(size, random)
  const realEdges = pathEdges(size, solution)

  // Arranque denso: la mitad de las celdas con número, siempre 1 y K.
  const draft: Draft = { positions: new Set([0, total - 1]), walls: new Set() }
  for (let i = 1; i < total - 1; i += 1) if (random() < 0.5) draft.positions.add(i)

  // Reparar hasta que la solución sea única.
  for (let guard = 0; guard < total; guard += 1) {
    const result = isUnique(size, solution, draft)
    if (result.count === 1 && !result.aborted) break
    if (result.aborted) return null

    const other = result.solutions.find((found) => divergence(solution, found) < total)
    if (!other) return null

    const at = divergence(solution, other)
    draft.positions.add(Math.min(at, total - 2))
    if (guard === total - 1) return null
  }

  // Quitar números mientras siga siendo única.
  const removable = shuffle(
    [...draft.positions].filter((index) => index !== 0 && index !== total - 1),
    random
  )

  for (const index of removable) {
    if (draft.positions.size <= target) break

    draft.positions.delete(index)
    const result = isUnique(size, solution, draft)

    if (result.count === 1 && !result.aborted) continue

    // Rompió la unicidad: a veces se paga con un muro en vez del número.
    let rescued = false

    if (!result.aborted && draft.walls.size < rules.maxWalls && random() < wallBias) {
      const added: number[] = []

      for (let attempt = 0; attempt < 3 && draft.walls.size < rules.maxWalls; attempt += 1) {
        const current = attempt === 0 ? result : isUnique(size, solution, draft)
        if (current.aborted) break
        if (current.count === 1) {
          rescued = true
          break
        }

        const other = current.solutions.find((found) => divergence(solution, found) < total)
        if (!other) break

        const wall = wallAgainst(size, realEdges, other, divergence(solution, other), random)
        if (wall === null || draft.walls.has(wall)) break

        draft.walls.add(wall)
        added.push(wall)
      }

      if (!rescued && added.length > 0) {
        const final = isUnique(size, solution, draft)
        rescued = final.count === 1 && !final.aborted
      }

      if (!rescued) for (const wall of added) draft.walls.delete(wall)
    }

    if (!rescued) draft.positions.add(index)
  }

  const count = draft.positions.size
  if (count < rules.minNumbers || count > rules.maxNumbers) return null

  const numbers = numbersFrom(solution, draft.positions)
  const check = solveZip({ size, numbers, walls: draft.walls }, 2, UNIQUE_NODE_LIMIT * 4)
  if (check.count !== 1 || check.aborted) return null

  const puzzle: ZipPuzzle = {
    size,
    numbers,
    walls: [...draft.walls].sort((a, b) => a - b),
    solution,
    score: 0,
  }

  puzzle.score = scoreZip(puzzle, check.nodes)
  return puzzle
}

/** Genera un puzzle con solución única. Reintenta hasta lograrlo. */
export function generateZipPuzzle(options: GenerateOptions): ZipPuzzle {
  const random = options.random ?? Math.random

  for (let attempt = 0; attempt < 200; attempt += 1) {
    const puzzle = tryGenerate(options, random)
    if (puzzle) return puzzle
  }

  throw new Error(`No se pudo generar un Zip de ${options.size}×${options.size}`)
}

/* ---------------------------------------------------------------------- */
/* 5. Puntaje                                                              */
/* ---------------------------------------------------------------------- */

export interface ZipMetrics {
  turns: number
  walls: number
  numbers: number
  /** Celdas seguidas sin número que guíe. */
  longestBlind: number
  /** Nodos que necesitó el solucionador. */
  nodes: number
}

export function measureZip(puzzle: ZipPuzzle, nodes?: number): ZipMetrics {
  const { solution, numbers } = puzzle
  let turns = 0

  for (let i = 2; i < solution.length; i += 1) {
    const a = solution[i - 1] - solution[i - 2]
    const b = solution[i] - solution[i - 1]
    if (a !== b) turns += 1
  }

  const numbered = new Set(numbers)
  let longestBlind = 0
  let run = 0
  for (const cell of solution) {
    if (numbered.has(cell)) {
      longestBlind = Math.max(longestBlind, run)
      run = 0
    } else {
      run += 1
    }
  }

  return {
    turns,
    walls: puzzle.walls.length,
    numbers: numbers.length,
    longestBlind,
    nodes: nodes ?? solveZip(puzzle, 2, UNIQUE_NODE_LIMIT * 4).nodes,
  }
}

/**
 * Puntaje 0–100. Los pesos siguen el índice estructural que se investigó
 * (tamaño 25, vueltas 25, muros 20, tramo ciego 15, densidad de números 15)
 * y se le suma el trabajo del solucionador, que es lo que más se parece a
 * "cuánto hay que pensar". Solo sirve para ordenar: dentro de un tamaño, más
 * alto = más difícil.
 */
export function scoreZip(puzzle: ZipPuzzle, nodes?: number): number {
  const { size } = puzzle
  const total = size * size
  const metrics = measureZip(puzzle, nodes)

  const sizePart = (size - 5) / 2 // 0, .5, 1
  const turnPart = Math.min(1, metrics.turns / (total - 2))
  const wallPart = Math.min(1, metrics.walls / 10)
  const blindPart = Math.min(1, metrics.longestBlind / (total * 0.5))
  const densityPart = 1 - Math.min(1, metrics.numbers / (total * 0.4))
  const searchPart = Math.min(1, Math.log2(1 + metrics.nodes) / Math.log2(1 + 20 * total))

  const structural =
    0.25 * sizePart + 0.25 * turnPart + 0.2 * wallPart + 0.15 * blindPart + 0.15 * densityPart

  return Math.round(100 * (0.6 * structural + 0.4 * searchPart))
}

/** Para depurar en consola: el tablero en texto. */
export function describeZip(puzzle: ZipPuzzle): string {
  const { size, numbers } = puzzle
  const lines: string[] = []

  for (let row = 0; row < size; row += 1) {
    let line = ''
    for (let column = 0; column < size; column += 1) {
      const cell = row * size + column
      const at = numbers.indexOf(cell)
      line += at === -1 ? ' .' : String(at + 1).padStart(2, ' ')
    }
    lines.push(line)
  }

  return lines.join('\n') + `\nmuros: ${puzzle.walls.length} · puntaje ${puzzle.score}`
}
