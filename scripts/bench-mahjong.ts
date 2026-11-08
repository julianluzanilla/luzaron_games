// Mide la dificultad de los repartos: parejas visibles al inicio y promedio en el primer tercio de una partida al azar.
import { dealMahjongBoard } from '../src/games/mahjong/mahjong-generator'
import { listAvailablePairs } from '../src/games/mahjong/mahjong-engine'

export function measureDeal(board: ReturnType<typeof dealMahjongBoard>['board']) {
  const start = listAvailablePairs(board).length
  const moves = board.tiles.length / 2
  let sum = 0, steps = 0, stuck = false
  for (let m = 0; m < moves / 3; m += 1) {
    const pairs = listAvailablePairs(board)
    if (pairs.length === 0) { stuck = true; break }
    sum += pairs.length; steps += 1
    const [a, b] = pairs[Math.floor(Math.random() * pairs.length)]
    a.removed = true; b.removed = true
  }
  for (const t of board.tiles) t.removed = false
  return { start, avg: sum / Math.max(steps, 1), stuck }
}

if (process.argv[1]?.includes('bench-mahjong')) {
  for (const id of ['torre', 'jardin', 'piramide', 'tortuga'] as const) {
    let s = 0, a = 0, st = 0; const n = 30; const t0 = Date.now()
    for (let i = 0; i < n; i += 1) { const r = measureDeal(dealMahjongBoard(id).board); s += r.start; a += r.avg; st += r.stuck ? 1 : 0 }
    console.log(`${id}: parejas al inicio ${(s / n).toFixed(1)} · promedio primer tercio ${(a / n).toFixed(1)} · trabados ${st}/${n} · ${((Date.now() - t0) / n).toFixed(0)} ms/reparto`)
  }
}
