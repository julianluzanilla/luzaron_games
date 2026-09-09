/**
 * POST /api/records — sube la cola de partidas terminadas.
 *
 * El cliente manda su `clientId` con cada record y aquí se usa como clave
 * primaria, así que subir dos veces la misma partida no la duplica: el
 * `INSERT OR IGNORE` la descarta en silencio. Eso es lo que permite reintentar
 * a ciegas al recuperar internet sin llevar cuenta de qué llegó y qué no.
 *
 * Se responde con los `clientId` aceptados para que el cliente los marque como
 * sincronizados; los que no vengan en la lista se reintentan después.
 */

import { currentUser } from '../../_lib/auth'
import { badRequest, json, readJson, unauthorized } from '../../_lib/http'
import type { PagesFunction } from '../../_lib/types'

interface IncomingRecord {
  clientId?: unknown
  gameId?: unknown
  packId?: unknown
  levelId?: unknown
  rawTimeMs?: unknown
  finalTimeMs?: unknown
  hintsUsed?: unknown
  hintPenaltyMs?: unknown
  isCleanRecord?: unknown
  completedAt?: unknown
}

/** Tope por petición: el cliente ya manda de 50 en 50. */
const MAX_BATCH = 50

const isPositiveInt = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 1000 * 60 * 60 * 24

const isShortString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 64

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const me = await currentUser(request, env)

  if (!me) return unauthorized()

  const body = await readJson<{ records?: IncomingRecord[] }>(request)
  const incoming = body?.records

  if (!Array.isArray(incoming)) return badRequest('Falta la lista de récords.')
  if (incoming.length > MAX_BATCH) return badRequest('Demasiados récords en una sola subida.')

  const now = new Date().toISOString()
  const accepted: string[] = []
  const statements = []

  for (const record of incoming) {
    // Un record mal formado se ignora en vez de tumbar la subida entera: si un
    // aparato guardó basura, el resto de la cola tiene que poder pasar.
    if (
      !isShortString(record.clientId) ||
      !isShortString(record.gameId) ||
      !isShortString(record.packId) ||
      !isShortString(record.levelId) ||
      !isPositiveInt(record.rawTimeMs) ||
      !isPositiveInt(record.finalTimeMs) ||
      typeof record.hintsUsed !== 'number' ||
      typeof record.completedAt !== 'string'
    ) {
      continue
    }

    statements.push(
      env.DB.prepare(
        `INSERT OR IGNORE INTO records
           (id, user_id, game_id, pack_id, level_id, raw_time_ms, final_time_ms,
            hints_used, hint_penalty_ms, is_clean_record, completed_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        record.clientId,
        me.id,
        record.gameId,
        record.packId,
        record.levelId,
        Math.round(record.rawTimeMs),
        Math.round(record.finalTimeMs),
        Math.max(0, Math.round(record.hintsUsed)),
        typeof record.hintPenaltyMs === 'number' ? Math.round(record.hintPenaltyMs) : 0,
        record.isCleanRecord === true ? 1 : 0,
        record.completedAt,
        now
      )
    )

    accepted.push(record.clientId)
  }

  if (statements.length > 0) await env.DB.batch(statements)

  return json({ accepted })
}
