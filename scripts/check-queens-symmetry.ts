// Self-check: every rotation/mirror of every pool puzzle keeps a unique solution equal to the transformed one.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { solveQueensBoard } from '../src/games/queens/queens-solver'
import { transformQueensPuzzle, canonicalRegionKey } from '../src/games/queens/queens-symmetry'

const { sizes } = JSON.parse(readFileSync('public/levels/queens/index.json', 'utf8'))
for (const { size } of sizes) {
  const pack = JSON.parse(readFileSync(`public/levels/queens/queens-${size}x${size}.json`, 'utf8'))
  for (const puzzle of pack.puzzles) {
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
console.log('queens symmetry ok')
