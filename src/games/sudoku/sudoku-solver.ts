/**
 * Solucionador de Sudoku.
 *
 * Hace dos trabajos distintos:
 *
 * 1. `countSolutions` — backtracking con máscaras de bits. Se corta apenas
 *    encuentra el límite pedido, así que preguntar "¿tiene solución única?"
 *    cuesta buscar como máximo dos soluciones.
 * 2. `gradePuzzle` — resuelve solo con técnicas humanas (singles, candidatos
 *    bloqueados, pares) para saber qué tan difícil es de verdad el puzzle.
 *    El número de pistas visibles no basta: un tablero con 30 números puede
 *    ser trivial o durísimo según dónde estén.
 */

import type { SudokuDifficulty, SudokuGeometry } from './sudoku-types'
import { boxOf, columnOf, rowOf } from './sudoku-types'

export interface SudokuUnits {
  /** Cada fila, columna y caja como lista de índices. */
  units: number[][]
  /** Las tres unidades a las que pertenece cada celda. */
  unitsOf: number[][][]
  /** Índices que comparten fila, columna o caja con la celda (sin incluirla). */
  peers: number[][]
  /** Máscara con todos los dígitos posibles. */
  fullMask: number
}

const unitsCache = new Map<number, SudokuUnits>()

export function getUnits(geometry: SudokuGeometry): SudokuUnits {
  const cached = unitsCache.get(geometry.size)
  if (cached) return cached

  const { size, cellCount } = geometry
  const rows: number[][] = Array.from({ length: size }, () => [])
  const columns: number[][] = Array.from({ length: size }, () => [])
  const boxes: number[][] = Array.from({ length: size }, () => [])

  for (let index = 0; index < cellCount; index += 1) {
    rows[rowOf(geometry, index)].push(index)
    columns[columnOf(geometry, index)].push(index)
    boxes[boxOf(geometry, index)].push(index)
  }

  const units = [...rows, ...columns, ...boxes]
  const unitsOf: number[][][] = []
  const peers: number[][] = []

  for (let index = 0; index < cellCount; index += 1) {
    const own = [rows[rowOf(geometry, index)], columns[columnOf(geometry, index)], boxes[boxOf(geometry, index)]]
    const peerSet = new Set<number>()

    for (const unit of own) {
      for (const cell of unit) if (cell !== index) peerSet.add(cell)
    }

    unitsOf.push(own)
    peers.push([...peerSet])
  }

  const built: SudokuUnits = {
    units,
    unitsOf,
    peers,
    fullMask: (1 << size) - 1,
  }

  unitsCache.set(geometry.size, built)

  return built
}

const bit = (digit: number): number => 1 << (digit - 1)

function popcount(mask: number): number {
  let count = 0
  let value = mask

  while (value) {
    value &= value - 1
    count += 1
  }

  return count
}

function lowestDigit(mask: number): number {
  return 31 - Math.clz32(mask & -mask) + 1
}

/**
 * Cuenta soluciones hasta `limit` (2 basta para verificar unicidad).
 * Elige siempre la celda con menos candidatos, que es lo que hace la
 * verificación barata incluso en tableros casi vacíos.
 */
export function countSolutions(grid: number[], geometry: SudokuGeometry, limit = 2): number {
  const { peers, fullMask } = getUnits(geometry)
  const working = grid.slice()
  const candidates = new Int32Array(geometry.cellCount)

  for (let index = 0; index < geometry.cellCount; index += 1) {
    if (working[index] !== 0) continue

    let mask = fullMask

    for (const peer of peers[index]) {
      if (working[peer] !== 0) mask &= ~bit(working[peer])
    }

    if (mask === 0) return 0

    candidates[index] = mask
  }

  let found = 0

  const search = (): boolean => {
    let best = -1
    let bestCount = 99

    for (let index = 0; index < geometry.cellCount; index += 1) {
      if (working[index] !== 0) continue

      const count = popcount(candidates[index])

      if (count === 0) return false
      if (count < bestCount) {
        best = index
        bestCount = count
        if (count === 1) break
      }
    }

    if (best === -1) {
      found += 1
      return found >= limit
    }

    let mask = candidates[best]

    while (mask !== 0) {
      const digit = lowestDigit(mask)
      const digitBit = bit(digit)

      mask &= ~digitBit

      const touched: number[] = []
      let contradiction = false

      working[best] = digit

      for (const peer of peers[best]) {
        if (working[peer] !== 0 || (candidates[peer] & digitBit) === 0) continue

        candidates[peer] &= ~digitBit
        touched.push(peer)

        if (candidates[peer] === 0) {
          contradiction = true
          break
        }
      }

      if (!contradiction && search()) return true

      working[best] = 0
      for (const peer of touched) candidates[peer] |= digitBit
    }

    return false
  }

  search()

  return found
}

export function hasUniqueSolution(grid: number[], geometry: SudokuGeometry): boolean {
  return countSolutions(grid, geometry, 2) === 1
}

export function solveOnce(grid: number[], geometry: SudokuGeometry): number[] | null {
  const { peers, fullMask } = getUnits(geometry)
  const working = grid.slice()

  const search = (): boolean => {
    let best = -1
    let bestMask = 0
    let bestCount = 99

    for (let index = 0; index < geometry.cellCount; index += 1) {
      if (working[index] !== 0) continue

      let mask = fullMask

      for (const peer of peers[index]) {
        if (working[peer] !== 0) mask &= ~bit(working[peer])
      }

      const count = popcount(mask)

      if (count === 0) return false
      if (count < bestCount) {
        best = index
        bestMask = mask
        bestCount = count
        if (count === 1) break
      }
    }

    if (best === -1) return true

    let mask = bestMask

    while (mask !== 0) {
      const digit = lowestDigit(mask)
      mask &= ~bit(digit)

      working[best] = digit
      if (search()) return true
      working[best] = 0
    }

    return false
  }

  return search() ? working : null
}

// ---------- Solucionador lógico (para calificar dificultad) ----------

interface LogicState {
  grid: number[]
  candidates: Int32Array
}

function buildLogicState(grid: number[], geometry: SudokuGeometry): LogicState | null {
  const { peers, fullMask } = getUnits(geometry)
  const candidates = new Int32Array(geometry.cellCount)

  for (let index = 0; index < geometry.cellCount; index += 1) {
    if (grid[index] !== 0) continue

    let mask = fullMask

    for (const peer of peers[index]) {
      if (grid[peer] !== 0) mask &= ~bit(grid[peer])
    }

    if (mask === 0) return null

    candidates[index] = mask
  }

  return { grid: grid.slice(), candidates }
}

function place(state: LogicState, geometry: SudokuGeometry, index: number, digit: number): boolean {
  const { peers } = getUnits(geometry)

  state.grid[index] = digit
  state.candidates[index] = 0

  for (const peer of peers[index]) {
    if (state.grid[peer] !== 0) continue

    state.candidates[peer] &= ~bit(digit)

    if (state.candidates[peer] === 0) return false
  }

  return true
}

/** Naked single: la celda solo admite un dígito. */
function applyNakedSingles(state: LogicState, geometry: SudokuGeometry): boolean | null {
  let progress = false

  for (let index = 0; index < geometry.cellCount; index += 1) {
    if (state.grid[index] !== 0) continue
    if (popcount(state.candidates[index]) !== 1) continue

    if (!place(state, geometry, index, lowestDigit(state.candidates[index]))) return null

    progress = true
  }

  return progress
}

/** Hidden single: el dígito solo cabe en una celda de la unidad. */
function applyHiddenSingles(state: LogicState, geometry: SudokuGeometry): boolean | null {
  const { units } = getUnits(geometry)
  let progress = false

  for (const unit of units) {
    for (let digit = 1; digit <= geometry.size; digit += 1) {
      const digitBit = bit(digit)
      let target = -1
      let count = 0
      let alreadyPlaced = false

      for (const index of unit) {
        if (state.grid[index] === digit) {
          alreadyPlaced = true
          break
        }

        if (state.grid[index] === 0 && (state.candidates[index] & digitBit) !== 0) {
          target = index
          count += 1
        }
      }

      if (alreadyPlaced) continue
      if (count === 0) return null

      if (count === 1) {
        if (!place(state, geometry, target, digit)) return null
        progress = true
      }
    }
  }

  return progress
}

/** Candidatos bloqueados: pointing (caja → línea) y claiming (línea → caja). */
function applyLockedCandidates(state: LogicState, geometry: SudokuGeometry): boolean {
  const { units, unitsOf } = getUnits(geometry)
  let progress = false

  for (const unit of units) {
    for (let digit = 1; digit <= geometry.size; digit += 1) {
      const digitBit = bit(digit)
      const spots: number[] = []
      let alreadyPlaced = false

      for (const index of unit) {
        if (state.grid[index] === digit) {
          alreadyPlaced = true
          break
        }
        if (state.grid[index] === 0 && (state.candidates[index] & digitBit) !== 0) spots.push(index)
      }

      if (alreadyPlaced || spots.length < 2) continue

      // Si todos los lugares posibles comparten otra unidad, el dígito se
      // puede descartar del resto de esa otra unidad.
      for (const shared of unitsOf[spots[0]]) {
        if (shared === unit) continue
        if (!spots.every((index) => shared.includes(index))) continue

        for (const index of shared) {
          if (spots.includes(index)) continue
          if (state.grid[index] !== 0) continue
          if ((state.candidates[index] & digitBit) === 0) continue

          state.candidates[index] &= ~digitBit
          progress = true
        }
      }
    }
  }

  return progress
}

/** Pares desnudos y pares ocultos dentro de una unidad. */
function applyPairs(state: LogicState, geometry: SudokuGeometry): boolean {
  const { units } = getUnits(geometry)
  let progress = false

  for (const unit of units) {
    const open = unit.filter((index) => state.grid[index] === 0)

    // Naked pair
    for (let a = 0; a < open.length; a += 1) {
      const maskA = state.candidates[open[a]]
      if (popcount(maskA) !== 2) continue

      for (let b = a + 1; b < open.length; b += 1) {
        if (state.candidates[open[b]] !== maskA) continue

        for (const index of open) {
          if (index === open[a] || index === open[b]) continue
          if ((state.candidates[index] & maskA) === 0) continue

          state.candidates[index] &= ~maskA
          progress = true
        }
      }
    }

    // Hidden pair
    for (let d1 = 1; d1 <= geometry.size; d1 += 1) {
      const bit1 = bit(d1)
      const spots1 = open.filter((index) => (state.candidates[index] & bit1) !== 0)
      if (spots1.length !== 2) continue

      for (let d2 = d1 + 1; d2 <= geometry.size; d2 += 1) {
        const bit2 = bit(d2)
        const spots2 = open.filter((index) => (state.candidates[index] & bit2) !== 0)

        if (spots2.length !== 2) continue
        if (spots1[0] !== spots2[0] || spots1[1] !== spots2[1]) continue

        const pairMask = bit1 | bit2

        for (const index of spots1) {
          if (state.candidates[index] === pairMask) continue

          state.candidates[index] &= pairMask
          progress = true
        }
      }
    }
  }

  return progress
}

export interface SudokuGrade {
  /** Se pudo terminar solo con las técnicas implementadas. */
  solvedByLogic: boolean
  /** Dificultad estimada. 'hard' incluye "necesita técnicas más avanzadas". */
  difficulty: SudokuDifficulty
}

/**
 * Califica el puzzle según la técnica más avanzada que hizo falta:
 * solo singles → fácil; con candidatos bloqueados o pares → normal;
 * si ni así sale → difícil.
 */
export function gradePuzzle(grid: number[], geometry: SudokuGeometry): SudokuGrade {
  const state = buildLogicState(grid, geometry)

  if (!state) return { solvedByLogic: false, difficulty: 'hard' }

  let usedAdvanced = false

  for (;;) {
    const singles = applyNakedSingles(state, geometry)
    if (singles === null) return { solvedByLogic: false, difficulty: 'hard' }
    if (singles) continue

    const hidden = applyHiddenSingles(state, geometry)
    if (hidden === null) return { solvedByLogic: false, difficulty: 'hard' }
    if (hidden) continue

    if (applyLockedCandidates(state, geometry)) {
      usedAdvanced = true
      continue
    }

    if (applyPairs(state, geometry)) {
      usedAdvanced = true
      continue
    }

    break
  }

  const solved = state.grid.every((value) => value !== 0)

  if (!solved) return { solvedByLogic: false, difficulty: 'hard' }

  return { solvedByLogic: true, difficulty: usedAdvanced ? 'normal' : 'easy' }
}

/** Candidatos posibles de una celda según lo que hay escrito ahora mismo. */
export function candidatesFor(grid: number[], geometry: SudokuGeometry, index: number): number[] {
  if (grid[index] !== 0) return []

  const { peers, fullMask } = getUnits(geometry)
  let mask = fullMask

  for (const peer of peers[index]) {
    if (grid[peer] !== 0) mask &= ~bit(grid[peer])
  }

  const digits: number[] = []

  while (mask !== 0) {
    const digit = lowestDigit(mask)
    mask &= ~bit(digit)
    digits.push(digit)
  }

  return digits
}

/**
 * Celda vacía más "obvia" del tablero actual: la que tiene menos candidatos.
 * Es la que usa el botón de pista cuando el jugador no seleccionó ninguna.
 */
export function findEasiestEmptyCell(grid: number[], geometry: SudokuGeometry): number | null {
  let best: number | null = null
  let bestCount = Number.POSITIVE_INFINITY

  for (let index = 0; index < geometry.cellCount; index += 1) {
    if (grid[index] !== 0) continue

    const count = candidatesFor(grid, geometry, index).length

    if (count < bestCount) {
      best = index
      bestCount = count
      if (count <= 1) break
    }
  }

  return best
}
