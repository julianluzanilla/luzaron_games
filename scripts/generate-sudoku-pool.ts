/**
 * Genera (o amplía) los packs de Sudoku precargados.
 *
 * Corre en local, fuera del bundle: escribe un JSON por variante y
 * dificultad en public/levels/sudoku/, más un index.json. Cada puzzle se
 * verifica con el mismo solucionador que usa el juego, así que todos tienen
 * **una sola solución** y la dificultad declarada corresponde a las técnicas
 * que hacen falta para resolverlo (ver src/games/sudoku/sudoku-solver.ts).
 *
 * Uso:
 *   npx tsx scripts/generate-sudoku-pool.ts --target 60
 *   npx tsx scripts/generate-sudoku-pool.ts --variants classic --difficulties hard --target 80
 *
 * --target es el total deseado por pack. Los puzzles que ya existen se
 * conservan (deduplicados por tablero inicial) y solo se rellena lo que
 * falte, así que se puede volver a correr para hacer crecer los packs.
 */

import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { generateSudokuPuzzle, isAcceptableGrade, mulberry32 } from '../src/games/sudoku/sudoku-generator'
import { countSolutions, gradePuzzle } from '../src/games/sudoku/sudoku-solver'
import {
  SUDOKU_DIFFICULTIES,
  SUDOKU_VARIANTS,
  getGeometry,
  gridFromString,
  toStoredSudokuPuzzle,
  type StoredSudokuPack,
  type StoredSudokuPuzzle,
  type SudokuDifficulty,
  type SudokuPackEntry,
  type SudokuVariant,
} from '../src/games/sudoku/sudoku-types'

// Se resuelve contra la raíz del proyecto: el script se corre con
// `npm run pool:sudoku`, siempre desde ahí.
const levelsDir = path.join(process.cwd(), 'public', 'levels', 'sudoku')

interface Args {
  variants: SudokuVariant[]
  difficulties: SudokuDifficulty[]
  target: number
  seed: number
}

function parseArgs(): Args {
  const args = process.argv.slice(2)
  const read = (flag: string): string | null => {
    const at = args.indexOf(flag)
    return at !== -1 && args[at + 1] ? args[at + 1] : null
  }

  const variants = (read('--variants')?.split(',') ?? SUDOKU_VARIANTS) as SudokuVariant[]
  const difficulties = (read('--difficulties')?.split(',') ?? SUDOKU_DIFFICULTIES) as SudokuDifficulty[]

  return {
    variants: variants.filter((variant) => SUDOKU_VARIANTS.includes(variant)),
    difficulties: difficulties.filter((difficulty) => SUDOKU_DIFFICULTIES.includes(difficulty)),
    target: Number(read('--target') ?? 60),
    seed: Number(read('--seed') ?? 20260909),
  }
}

function packPath(variant: SudokuVariant, difficulty: SudokuDifficulty): string {
  return path.join(levelsDir, `sudoku-${variant}-${difficulty}.json`)
}

function readExisting(variant: SudokuVariant, difficulty: SudokuDifficulty): StoredSudokuPuzzle[] {
  const file = packPath(variant, difficulty)

  if (!existsSync(file)) return []

  try {
    const pack = JSON.parse(readFileSync(file, 'utf8')) as StoredSudokuPack
    return pack.puzzles ?? []
  } catch {
    return []
  }
}

function pad(value: number): string {
  return String(value).padStart(4, '0')
}

function buildPack(variant: SudokuVariant, difficulty: SudokuDifficulty, target: number, seed: number): void {
  const geometry = getGeometry(variant)
  const existing = readExisting(variant, difficulty)
  const seen = new Set(existing.map((puzzle) => puzzle.givens))
  const puzzles = [...existing]
  const random = mulberry32(seed)

  let attempts = 0

  while (puzzles.length < target && attempts < target * 60) {
    attempts += 1

    const puzzle = generateSudokuPuzzle({
      variant,
      difficulty,
      random,
      id: `sudoku-${variant}-${difficulty}-${pad(puzzles.length + 1)}`,
    })

    const stored = toStoredSudokuPuzzle(puzzle)

    if (seen.has(stored.givens)) continue

    // Doble verificación antes de escribir: unicidad y dificultad real.
    const grid = gridFromString(stored.givens)

    if (countSolutions(grid, geometry, 2) !== 1) continue
    if (!isAcceptableGrade(variant, difficulty, gradePuzzle(grid, geometry).difficulty)) continue

    seen.add(stored.givens)
    puzzles.push(stored)
  }

  // Renumerar los ids para que sigan el orden del pack.
  const numbered = puzzles.map((puzzle, index) => ({
    ...puzzle,
    id: `sudoku-${variant}-${difficulty}-${pad(index + 1)}`,
  }))

  const pack: StoredSudokuPack = {
    variant,
    difficulty,
    generatedAt: new Date().toISOString(),
    puzzles: numbered,
  }

  mkdirSync(levelsDir, { recursive: true })
  writeFileSync(packPath(variant, difficulty), JSON.stringify(pack, null, 2))

  const givensCounts = numbered.map((puzzle) => [...puzzle.givens].filter((char) => char !== '0').length)
  const min = Math.min(...givensCounts)
  const max = Math.max(...givensCounts)

  console.log(`${variant}/${difficulty}: ${numbered.length} puzzles · pistas ${min}-${max} · ${attempts} intentos`)
}

function writeIndex(): void {
  const packs: SudokuPackEntry[] = []

  for (const variant of SUDOKU_VARIANTS) {
    for (const difficulty of SUDOKU_DIFFICULTIES) {
      const file = packPath(variant, difficulty)
      if (!existsSync(file)) continue

      const pack = JSON.parse(readFileSync(file, 'utf8')) as StoredSudokuPack

      packs.push({ variant, difficulty, count: pack.puzzles.length })
    }
  }

  writeFileSync(path.join(levelsDir, 'index.json'), JSON.stringify({ packs }, null, 2))
  console.log(`index.json: ${packs.length} packs`)
}

function main(): void {
  const args = parseArgs()

  mkdirSync(levelsDir, { recursive: true })

  let seed = args.seed

  for (const variant of args.variants) {
    for (const difficulty of args.difficulties) {
      seed += 7919
      buildPack(variant, difficulty, args.target, seed)
    }
  }

  writeIndex()
}

main()
