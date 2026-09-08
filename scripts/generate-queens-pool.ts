/**
 * Generates (or extends) the Queens puzzle pool.
 *
 * This runs offline/locally — it is NOT part of the app bundle. It writes
 * one JSON file per board size to public/levels/queens/, each containing a
 * list of puzzles with a verified single solution (see
 * src/games/queens/queens-generator.ts for how uniqueness is guaranteed).
 *
 * Usage:
 *   npx tsx scripts/generate-queens-pool.ts --sizes 5,6,7,8,9,10,11,12 --target 60
 *   npx tsx scripts/generate-queens-pool.ts --sizes 12 --target 40 --add
 *
 * --target is the desired total puzzle count per size. Existing puzzles in
 * the JSON file are kept (deduplicated by solution) and topped up to reach
 * the target, so it's safe to re-run this later to grow the pool.
 */

import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { generateQueensPuzzle } from '../src/games/queens/queens-generator'

interface StoredPuzzle {
  id: string
  size: number
  regionOf: number[][]
  solution: number[]
}

interface StoredPack {
  size: number
  generatedAt: string
  puzzles: StoredPuzzle[]
}

const here = path.dirname(fileURLToPath(import.meta.url))
const levelsDir = path.join(here, '..', 'public', 'levels', 'queens')

function parseArgs(): { sizes: number[]; target: number } {
  const args = process.argv.slice(2)
  let sizes = [5, 6, 7, 8, 9, 10, 11, 12]
  let target = 60

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--sizes') {
      sizes = args[i + 1].split(',').map((value) => Number.parseInt(value.trim(), 10))
      i += 1
    } else if (args[i] === '--target') {
      target = Number.parseInt(args[i + 1], 10)
      i += 1
    }
  }

  return { sizes, target }
}

function solutionKey(solution: number[]): string {
  return solution.join(',')
}

function loadExisting(size: number): StoredPack {
  const filePath = path.join(levelsDir, `queens-${size}x${size}.json`)

  if (existsSync(filePath)) {
    const raw = JSON.parse(readFileSync(filePath, 'utf8')) as StoredPack
    return raw
  }

  return { size, generatedAt: new Date().toISOString(), puzzles: [] }
}

function attemptBudgetFor(size: number): { maxOuterAttempts: number; maxRepairRounds: number } {
  if (size <= 8) return { maxOuterAttempts: 10, maxRepairRounds: 600 }
  if (size <= 10) return { maxOuterAttempts: 12, maxRepairRounds: 900 }

  return { maxOuterAttempts: 18, maxRepairRounds: 1200 }
}

function writePoolIndex(): void {
  const sizes = [5, 6, 7, 8, 9, 10, 11, 12]
  const index: Array<{ size: number; count: number }> = []

  for (const size of sizes) {
    const filePath = path.join(levelsDir, `queens-${size}x${size}.json`)

    if (!existsSync(filePath)) continue

    const pack = JSON.parse(readFileSync(filePath, 'utf8')) as StoredPack

    if (pack.puzzles.length > 0) {
      index.push({ size, count: pack.puzzles.length })
    }
  }

  writeFileSync(path.join(levelsDir, 'index.json'), JSON.stringify({ sizes: index }, null, 2))
  console.log(`\nWrote pool index: ${index.map((entry) => `${entry.size}x${entry.size} (${entry.count})`).join(', ')}`)
}

function run(): void {
  mkdirSync(levelsDir, { recursive: true })

  const { sizes, target } = parseArgs()

  for (const size of sizes) {
    const pack = loadExisting(size)
    const seenSolutions = new Set(pack.puzzles.map((puzzle) => solutionKey(puzzle.solution)))

    console.log(`\n[size ${size}x${size}] starting with ${pack.puzzles.length} puzzle(s), target ${target}`)

    let attemptsSinceLastSuccess = 0
    const budget = attemptBudgetFor(size)

    while (pack.puzzles.length < target && attemptsSinceLastSuccess < 40) {
      const startedAt = Date.now()
      const generated = generateQueensPuzzle(size, budget)
      const elapsedMs = Date.now() - startedAt

      if (!generated) {
        attemptsSinceLastSuccess += 1
        continue
      }

      const key = solutionKey(generated.solution)

      if (seenSolutions.has(key)) {
        attemptsSinceLastSuccess += 1
        continue
      }

      seenSolutions.add(key)
      attemptsSinceLastSuccess = 0

      const puzzle: StoredPuzzle = {
        id: `queens-${size}x${size}-${String(pack.puzzles.length + 1).padStart(4, '0')}`,
        size,
        regionOf: generated.regionOf,
        solution: generated.solution,
      }

      pack.puzzles.push(puzzle)
      pack.generatedAt = new Date().toISOString()

      const filePath = path.join(levelsDir, `queens-${size}x${size}.json`)
      writeFileSync(filePath, JSON.stringify(pack, null, 2))

      console.log(
        `  + ${puzzle.id} (${pack.puzzles.length}/${target}) in ${elapsedMs}ms`
      )
    }

    const filePath = path.join(levelsDir, `queens-${size}x${size}.json`)
    console.log(`[size ${size}x${size}] wrote ${pack.puzzles.length} puzzle(s) -> ${filePath}`)
  }

  writePoolIndex()
}

run()
