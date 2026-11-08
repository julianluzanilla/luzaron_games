// Mide la dificultad de los repartos por nivel: parejas visibles al inicio, promedio en el primer
// tercio de una partida al azar, qué tan seguido se traba quien juega al azar, y tiempo por reparto.
// Además verifica que la semilla repita el reparto y que barajar deje parejas y no rompa ninguna.
import assert from 'node:assert/strict'
import {
  dealMahjongBoard,
  deadEndRate,
  mulberry32,
  reshuffleRemaining,
} from '../src/games/mahjong/mahjong-generator'
import { listAvailablePairs } from '../src/games/mahjong/mahjong-engine'
import type { MahjongDifficulty } from '../src/games/mahjong/mahjong-types'

type Board = ReturnType<typeof dealMahjongBoard>['board']

export function measureDeal(board: Board) {
  const start = listAvailablePairs(board).length
  const moves = board.tiles.length / 2
  let sum = 0,
    steps = 0
  for (let m = 0; m < moves / 3; m += 1) {
    const pairs = listAvailablePairs(board)
    if (pairs.length === 0) break
    sum += pairs.length
    steps += 1
    const [a, b] = pairs[Math.floor(Math.random() * pairs.length)]
    a.removed = true
    b.removed = true
  }
  for (const t of board.tiles) t.removed = false
  return { start, avg: sum / Math.max(steps, 1) }
}

const faces = (b: Board) => b.tiles.map((t) => t.face.id).join(',')

if (process.argv[1]?.includes('bench-mahjong')) {
  const levels: MahjongDifficulty[] = ['facil', 'normal', 'dificil']
  for (const id of ['torre', 'jardin', 'piramide', 'tortuga'] as const) {
    for (const level of levels) {
      let s = 0,
        a = 0,
        dead = 0,
        ms = 0
      const n = 12
      for (let i = 0; i < n; i += 1) {
        const t0 = Date.now()
        const { board, guaranteed } = dealMahjongBoard(id, undefined, level)
        ms += Date.now() - t0
        assert.ok(guaranteed)
        const r = measureDeal(board)
        s += r.start
        a += r.avg
        dead += deadEndRate(board, mulberry32(i), 20)
      }
      console.log(
        `${id} ${level}: inicio ${(s / n).toFixed(1)} · primer tercio ${(a / n).toFixed(1)} · se traba al azar ${((dead / n) * 100).toFixed(0)}% · ${(ms / n).toFixed(0)} ms`
      )
    }
    // Misma semilla, mismo reparto.
    for (const level of levels)
      assert.equal(
        faces(dealMahjongBoard(id, 42, level).board),
        faces(dealMahjongBoard(id, 42, level).board)
      )
  }

  // Barajar a mitad de partida: si funciona, cada dibujo sigue con pareja y hay al menos una a la vista.
  let reshuffles = 0,
    failed = 0,
    after = 0
  for (let i = 0; i < 200; i += 1) {
    const level = levels[i % 3]
    const { board } = dealMahjongBoard('tortuga', i, level)
    const random = mulberry32(i)
    for (;;) {
      const pairs = listAvailablePairs(board)
      if (pairs.length === 0) break
      const [x, y] = pairs[Math.floor(random() * pairs.length)]
      x.removed = true
      y.removed = true
    }
    if (board.tiles.every((t) => t.removed)) continue
    const before = faces(board)
    const ok = reshuffleRemaining(board, i, level)
    const counts = new Map<string, number>()
    for (const t of board.tiles)
      if (!t.removed) counts.set(t.face.matchKey, (counts.get(t.face.matchKey) ?? 0) + 1)
    for (const c of counts.values()) assert.equal(c % 2, 0)
    if (ok) {
      reshuffles += 1
      const p = listAvailablePairs(board).length
      assert.ok(p > 0)
      after += p
    } else {
      failed += 1
      assert.equal(faces(board), before)
    }
  }
  console.log(
    `barajar: ${reshuffles} bien (promedio ${(after / Math.max(reshuffles, 1)).toFixed(1)} parejas después), ${failed} sin salida`
  )
  console.log('OK')
}
