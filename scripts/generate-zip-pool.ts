/**
 * Genera (o amplía) los packs de Zip precargados.
 *
 * Escribe public/levels/zip/zip-{5x5|6x6|7x7}.json y un index.json. Por cada
 * tamaño genera varias veces más candidatos de los que hacen falta y elige
 * los que cubren **todo el rango de puntaje** de forma pareja; luego ordena el
 * pack de menor a mayor puntaje para que "Siguiente" suba la dificultad poco
 * a poco. Cada puzzle se verifica con el solucionador del juego: solución
 * única y la misma que trae guardada.
 *
 * Uso:
 *   npm run pool:zip
 *   npx tsx scripts/generate-zip-pool.ts --sizes 7 --target 150 --seed 7
 *
 * Los puzzles que ya existen se conservan (deduplicados por números + muros)
 * y solo se rellena lo que falte. Ojo: al reordenar por puntaje cambia el
 * número de puzzle de los que ya había.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { generateZipPuzzle, mulberry32 } from '../src/games/zip/zip-generator'
import { solveZip } from '../src/games/zip/zip-solver'
import {
  SIZE_RULES,
  ZIP_SIZES,
  toStoredZipPuzzle,
  toZipPuzzle,
  type StoredZipPack,
  type StoredZipPuzzle,
  type ZipPackIndex,
  type ZipSize,
} from '../src/games/zip/zip-types'

const levelsDir = path.join(process.cwd(), 'public', 'levels', 'zip')

interface Args {
  sizes: ZipSize[]
  target: number
  seed: number
  oversample: number
}

function parseArgs(): Args {
  const args = process.argv.slice(2)
  const read = (flag: string): string | null => {
    const at = args.indexOf(flag)
    return at !== -1 && args[at + 1] ? args[at + 1] : null
  }

  const sizes = (read('--sizes')?.split(',').map(Number) ?? ZIP_SIZES) as ZipSize[]

  return {
    sizes: sizes.filter((size) => ZIP_SIZES.includes(size)),
    target: Number(read('--target') ?? 150),
    seed: Number(read('--seed') ?? 20260925),
    oversample: Number(read('--oversample') ?? 4),
  }
}

function keyOf(puzzle: StoredZipPuzzle): string {
  return `${puzzle.nums.join(',')}|${puzzle.walls.join(',')}`
}

function packFile(size: ZipSize): string {
  return path.join(levelsDir, `zip-${size}x${size}.json`)
}

function readPack(size: ZipSize): StoredZipPuzzle[] {
  const file = packFile(size)
  if (!existsSync(file)) return []
  return (JSON.parse(readFileSync(file, 'utf8')) as StoredZipPack).puzzles
}

/** Verificación independiente de lo que se va a escribir. */
function verify(size: ZipSize, stored: StoredZipPuzzle): string | null {
  const puzzle = toZipPuzzle(size, stored)
  const rules = SIZE_RULES[size]
  const total = size * size

  if (puzzle.solution.length !== total) return 'la solución no cubre el tablero'
  if (new Set(puzzle.solution).size !== total) return 'la solución repite celdas'
  if (puzzle.solution[total - 1] !== puzzle.numbers[puzzle.numbers.length - 1]) {
    return 'la solución no termina en K'
  }
  if (puzzle.numbers.length < rules.minNumbers || puzzle.numbers.length > rules.maxNumbers) {
    return `números fuera de rango (${puzzle.numbers.length})`
  }
  if (puzzle.walls.length > rules.maxWalls) return `demasiados muros (${puzzle.walls.length})`

  const result = solveZip(puzzle, 3, 20_000_000)
  if (result.aborted) return 'el solucionador no terminó'
  if (result.count !== 1) return `${result.count} soluciones`
  if (result.solutions[0].join(',') !== puzzle.solution.join(',')) {
    return 'la solución guardada no coincide'
  }

  return null
}

/** Elige `count` elementos repartidos parejo sobre una lista ordenada. */
function spread<T>(sorted: T[], count: number): T[] {
  if (sorted.length <= count) return sorted.slice()
  const picked: T[] = []
  for (let i = 0; i < count; i += 1) {
    picked.push(sorted[Math.round((i * (sorted.length - 1)) / (count - 1))])
  }
  return picked
}

function main(): void {
  const args = parseArgs()
  mkdirSync(levelsDir, { recursive: true })

  for (const size of args.sizes) {
    const existing = readPack(size)
    const seen = new Set(existing.map(keyOf))
    const missing = Math.max(0, args.target - existing.length)
    const random = mulberry32(args.seed * 31 + size)
    const candidates: StoredZipPuzzle[] = []
    const started = Date.now()

    while (candidates.length < missing * args.oversample) {
      const stored = toStoredZipPuzzle(generateZipPuzzle({ size, random }))
      const key = keyOf(stored)
      if (seen.has(key)) continue
      seen.add(key)
      candidates.push(stored)
    }

    candidates.sort((a, b) => a.score - b.score)
    const chosen = [...existing, ...spread(candidates, missing)]

    for (const puzzle of chosen) {
      const problem = verify(size, puzzle)
      if (problem) throw new Error(`Zip ${size}×${size} inválido: ${problem}`)
    }

    chosen.sort((a, b) => a.score - b.score)

    const pack: StoredZipPack = { size, puzzles: chosen }
    writeFileSync(packFile(size), JSON.stringify(pack) + '\n')

    const scores = chosen.map((puzzle) => puzzle.score)
    const walls = chosen.map((puzzle) => puzzle.walls.length)
    const numbers = chosen.map((puzzle) => puzzle.nums.length)
    const free = chosen.filter((puzzle) => puzzle.walls.length === 0).length
    console.log(
      `${size}×${size}: ${chosen.length} puzzles (${missing} nuevos de ${candidates.length} candidatos, ` +
        `${((Date.now() - started) / 1000).toFixed(1)} s) · puntaje ${scores[0]}–${scores[scores.length - 1]} · ` +
        `números ${Math.min(...numbers)}–${Math.max(...numbers)} · muros ${Math.min(...walls)}–${Math.max(...walls)} · ` +
        `${free} sin muros`
    )
  }

  const index: ZipPackIndex = {
    packs: ZIP_SIZES.filter((size) => existsSync(packFile(size))).map((size) => ({
      size,
      count: readPack(size).length,
    })),
  }
  writeFileSync(path.join(levelsDir, 'index.json'), JSON.stringify(index, null, 2) + '\n')
}

main()
