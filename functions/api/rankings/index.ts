/**
 * GET /api/rankings?game=&pack=&level= — top 3 de un puzzle concreto.
 *
 * Reglas del PRODUCT_SPEC §14: solo partidas sin pistas, ordenadas por tiempo,
 * y como mucho un renglón por persona (si no, quien juegue el mismo puzzle diez
 * veces se queda con todo el podio). Todavía no lo consume ninguna pantalla:
 * está listo para el modal de completado.
 */

import { currentUser } from '../../_lib/auth'
import { badRequest, json, unauthorized } from '../../_lib/http'
import type { PagesFunction } from '../../_lib/types'

interface RankingRow {
  username: string
  full_name: string
  final_time_ms: number
  completed_at: string
}

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const me = await currentUser(request, env)

  if (!me) return unauthorized()

  const url = new URL(request.url)
  const gameId = url.searchParams.get('game')
  const packId = url.searchParams.get('pack')
  const levelId = url.searchParams.get('level')

  if (!gameId || !packId || !levelId) return badRequest('Faltan game, pack o level.')

  const { results } = await env.DB.prepare(
    `SELECT u.username, u.full_name, MIN(r.final_time_ms) AS final_time_ms,
            MIN(r.completed_at) AS completed_at
       FROM records r
       JOIN users u ON u.id = r.user_id
      WHERE r.game_id = ? AND r.pack_id = ? AND r.level_id = ?
        AND r.is_clean_record = 1 AND u.is_active = 1
      GROUP BY r.user_id
      ORDER BY final_time_ms ASC
      LIMIT 3`
  )
    .bind(gameId, packId, levelId)
    .all<RankingRow>()

  return json({
    rows: results.map((row) => ({
      username: row.username,
      fullName: row.full_name,
      finalTimeMs: row.final_time_ms,
      completedAt: row.completed_at,
    })),
  })
}
