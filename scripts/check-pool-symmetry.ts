// Self-check: the random rotations/relabels the app applies keep every pool puzzle valid,
// with the same single solution (moved accordingly) and, for Sudoku, the same difficulty.
// Usage: npx tsx scripts/check-pool-symmetry.ts
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { solveQueensBoard } from '../src/games/queens/queens-solver'
import { transformQueensPuzzle, canonicalRegionKey } from '../src/games/queens/queens-symmetry'
import { countSolutions, gradePuzzle, solveOnce } from '../src/games/sudoku/sudoku-solver'
import { transformSudokuPuzzle } from '../src/games/sudoku/sudoku-symmetry'
import { getGeometry, toSudokuPuzzle } from '../src/games/sudoku/sudoku-types'
import { solveZip } from '../src/games/zip/zip-solver'
import { transformZipPuzzle } from '../src/games/zip/zip-symmetry'
import { toZipPuzzle } from '../src/games/zip/zip-types'

const read = (file: string) => JSON.parse(readFileSync(`public/levels/${file}`, 'utf8'))

for (const { size } of read('queens/index.json').sizes) {
  for (const puzzle of read(`queens/queens-${size}x${size}.json`).puzzles) {
    const key = canonicalRegionKey(puzzle)
    for (let k = 0; k < 8; k += 1) {
      const t = transformQueensPuzzle(puzzle, k)
      const result = solveQueensBoard(size, t.regionOf, { collect: true, limit: 2 })
      assert.equal(result.count, 1, `${puzzle.id} k=${k}`)
      assert.deepEqual(result.solutions[0], t.solution, `${puzzle.id} k=${k}`)
      assert.equal(canonicalRegionKey(t), key, `${puzzle.id} k=${k} key`)
    }
  }
}
console.log('queens ok')

for (const { variant, difficulty } of read('sudoku/index.json').packs) {
  const geometry = getGeometry(variant)
  for (const stored of read(`sudoku/sudoku-${variant}-${difficulty}.json`).puzzles) {
    const original = toSudokuPuzzle(stored)
    const grade = gradePuzzle(original.givens, geometry).difficulty
    for (let i = 0; i < 3; i += 1) {
      const t = transformSudokuPuzzle(original)
      assert.equal(countSolutions(t.givens, geometry, 2), 1, stored.id)
      assert.deepEqual(solveOnce(t.givens, geometry), t.solution, stored.id)
      assert.equal(gradePuzzle(t.givens, geometry).difficulty, grade, `${stored.id} grade`)
    }
  }
}
console.log('sudoku ok')

for (const { size } of read('zip/index.json').packs) {
  for (const [index, stored] of read(`zip/zip-${size}x${size}.json`).puzzles.entries()) {
    const original = toZipPuzzle(size, stored)
    for (let k = 0; k < 8; k += 1) {
      const t = transformZipPuzzle(original, k)
      assert.ok(t.walls.every((wall) => wall >= 0), `zip ${size} #${index + 1} k=${k} wall`)
      const result = solveZip(t, 2, 20_000_000)
      assert.ok(!result.aborted && result.count === 1, `zip ${size} #${index + 1} k=${k}`)
      assert.deepEqual(result.solutions[0], t.solution, `zip ${size} #${index + 1} k=${k}`)
    }
  }
}
console.log('zip ok')
