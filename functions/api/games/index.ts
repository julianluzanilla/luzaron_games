/**
 * /api/games — interruptor global de juegos.
 *
 * GET — público: qué juegos están desactivados. Un juego sin fila está activo,
 *       así que un juego nuevo aparece solo sin tocar la base.
 * PUT — solo admin: `{ gameId, enabled }`.
 *
 * Desactivar un juego solo lo oculta: sigue dentro del build (y del modo
 * offline) y sus récords no se tocan. Ver db/002-game-settings.sql.
 */

import { currentUser } from '../../_lib/auth'
import { badRequest, forbidden, json, readJson, unauthorized } from '../../_lib/http'
import type { PagesFunction } from '../../_lib/types'

interface Row {
  game_id: string
  enabled: number
}

export const onRequestGet: PagesFunction = async ({ env }) => {
  try {
    const { results } = await env.DB.prepare(
      'SELECT game_id, enabled FROM game_settings'
    ).all<Row>()

    const games: Record<string, boolean> = {}
    for (const row of results) games[row.game_id] = row.enabled === 1

    return json({ games })
  } catch {
    // La tabla todavía no existe (falta correr db/002): todo activo.
    return json({ games: {} })
  }
}

interface PutBody {
  gameId?: unknown
  enabled?: unknown
}

export const onRequestPut: PagesFunction = async ({ request, env }) => {
  const me = await currentUser(request, env)

  if (!me) return unauthorized()
  if (me.role !== 'admin') return forbidden()

  const body = await readJson<PutBody>(request)

  if (
    typeof body?.gameId !== 'string' ||
    !/^[a-z0-9-]{2,24}$/.test(body.gameId) ||
    typeof body.enabled !== 'boolean'
  ) {
    return badRequest('Juego o estado no válido.')
  }

  await env.DB.prepare(
    `INSERT INTO game_settings (game_id, enabled, updated_at) VALUES (?, ?, ?)
     ON CONFLICT (game_id) DO UPDATE SET enabled = excluded.enabled, updated_at = excluded.updated_at`
  )
    .bind(body.gameId, body.enabled ? 1 : 0, new Date().toISOString())
    .run()

  return json({ gameId: body.gameId, enabled: body.enabled })
}
