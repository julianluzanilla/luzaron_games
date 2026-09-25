/**
 * Solucionador de Zip.
 *
 * Búsqueda en profundidad desde el 1 que **cuenta soluciones** (se corta en
 * `limit`, normalmente 2: basta para saber si la solución es única). Lo que
 * la hace rápida en tableros de hasta 7×7 son cuatro podas, todas locales o
 * lineales en el número de celdas:
 *
 * 1. **Orden**: solo se entra a un número si es el siguiente que toca, y a K
 *    solo como última celda.
 * 2. **Grado**: una celda libre que no es K necesita dos vecinas disponibles
 *    (entrar y salir); K necesita una. Al mover la cabeza solo cambian las
 *    vecinas de la cabeza anterior, así que basta revisar esas.
 * 3. **Paridad**: el tablero es bipartito (ajedrez). Lo que falta recorrer
 *    alterna colores, así que las cuentas de cada color tienen que cuadrar.
 * 4. **Conectividad**: todas las celdas libres tienen que seguir alcanzables
 *    desde la cabeza.
 *
 * Además de contar, guarda las primeras soluciones que encuentra: el
 * generador usa la segunda para saber dónde poner un muro o un número.
 */

import { openNeighbors, type ZipPuzzle } from './zip-types'

export interface SolveResult {
  /** Soluciones encontradas (como mucho `limit`). */
  count: number
  /** Las soluciones halladas, en el orden en que salieron. */
  solutions: number[][]
  /** Nodos visitados: medida del trabajo que costó (sirve para el puntaje). */
  nodes: number
  /** true si se agotó `maxNodes` antes de terminar: el conteo no es fiable. */
  aborted: boolean
}

export interface SolveInput {
  size: number
  numbers: number[]
  walls: Iterable<number>
}

export function solveZip(
  input: SolveInput | ZipPuzzle,
  limit = 2,
  maxNodes = 400_000
): SolveResult {
  const { size, numbers } = input
  const total = size * size
  const neighbors = openNeighbors(size, new Set(input.walls))
  const numberAt = new Int16Array(total)
  numbers.forEach((cell, index) => {
    numberAt[cell] = index + 1
  })

  const lastNumber = numbers.length
  const endCell = numbers[lastNumber - 1]
  const visited = new Uint8Array(total)
  const path: number[] = []
  const solutions: number[][] = []

  // Color de ajedrez y cuántas celdas libres quedan de cada color.
  const color = new Uint8Array(total)
  const free = [0, 0]
  for (let cell = 0; cell < total; cell += 1) {
    color[cell] = ((cell % size) + Math.floor(cell / size)) & 1
    free[color[cell]] += 1
  }

  // Pila reutilizable para el flood fill.
  const stack = new Int16Array(total)
  const seen = new Uint32Array(total)
  let stamp = 0

  let nodes = 0
  let aborted = false

  const availableDegree = (cell: number, head: number): number => {
    let degree = 0
    for (const other of neighbors[cell]) {
      if (!visited[other] || other === head) degree += 1
    }
    return degree
  }

  const parityOk = (head: number, remaining: number): boolean => {
    if (remaining === 0) return true
    // El recorrido que falta empieza con el color contrario a la cabeza.
    const opposite = free[color[head] ^ 1]
    const same = free[color[head]]
    return remaining % 2 === 0 ? opposite === same : opposite === same + 1
  }

  const connectedOk = (head: number, remaining: number): boolean => {
    if (remaining === 0) return true
    stamp += 1
    let top = 0
    let reached = 0
    stack[top++] = head
    seen[head] = stamp

    while (top > 0) {
      const cell = stack[--top]
      for (const other of neighbors[cell]) {
        if (visited[other] || seen[other] === stamp) continue
        seen[other] = stamp
        reached += 1
        stack[top++] = other
      }
    }

    return reached === remaining
  }

  const search = (head: number, nextNumber: number): void => {
    if (solutions.length >= limit || aborted) return

    nodes += 1
    if (nodes > maxNodes) {
      aborted = true
      return
    }

    if (path.length === total) {
      if (head === endCell) solutions.push(path.slice())
      return
    }

    for (const next of neighbors[head]) {
      if (visited[next]) continue

      const value = numberAt[next]
      if (value !== 0 && value !== nextNumber) continue
      if (next === endCell && path.length + 1 !== total) continue

      visited[next] = 1
      free[color[next]] -= 1
      path.push(next)

      const remaining = total - path.length
      let ok = parityOk(next, remaining)

      // Poda de grado: solo cambian las vecinas de la cabeza anterior.
      if (ok) {
        for (const other of neighbors[head]) {
          if (visited[other]) continue
          const need = other === endCell ? 1 : 2
          if (availableDegree(other, next) < need) {
            ok = false
            break
          }
        }
      }

      if (ok && remaining > 0 && availableDegree(next, -1) === 0) ok = false
      if (ok) ok = connectedOk(next, remaining)

      if (ok) search(next, value !== 0 ? nextNumber + 1 : nextNumber)

      path.pop()
      free[color[next]] += 1
      visited[next] = 0

      if (solutions.length >= limit || aborted) return
    }
  }

  const start = numbers[0]
  visited[start] = 1
  free[color[start]] -= 1
  path.push(start)

  if (total === 1) {
    solutions.push(path.slice())
  } else if (parityOk(start, total - 1) && connectedOk(start, total - 1)) {
    search(start, 2)
  }

  return { count: solutions.length, solutions, nodes, aborted }
}
