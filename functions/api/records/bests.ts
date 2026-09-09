/**
 * GET /api/records/bests — el mejor tiempo del usuario por categoría.
 *
 * Solo cuentan las partidas limpias (sin pistas), igual que en la app. Se
 * devuelve con `levelId = '*'` porque es el agregado de toda la categoría, no
 * el tiempo de un puzzle concreto; los tiempos por puzzle salen de /api/rankings.
 */

import { currentUser } from '../../_lib/auth'
import { json, unauthorized } from '../../_lib/http'
import type { PagesFunction } from '../../_lib/types'

interface BestRow {
  game_id: string
  pack_id: string
  best_ms: number
}

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const me = await currentUser(request, env)

  if (!me) return unauthorized()

  const { results } = await env.DB.prepare(
    `SELECT game_id, pack_id, MIN(final_time_ms) AS best_ms
       FROM records
      WHERE user_id = ? AND is_clean_record = 1
      GROUP BY game_id, pack_id`
  )
    .bind(me.id)
    .all<BestRow>()

  return json({
    bests: results.map((row) => ({
      gameId: row.game_id,
      packId: row.pack_id,
      levelId: '*',
      finalTimeMs: row.best_ms,
    })),
  })
}
