/** POST /api/auth/logout — suelta este aparato. */

import { clearedSessionCookie, destroySession, readSessionToken } from '../../_lib/auth'
import { json } from '../../_lib/http'
import type { PagesFunction } from '../../_lib/types'

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const token = readSessionToken(request)

  if (token) await destroySession(env.DB, token)

  // Se contesta OK aunque no hubiera sesión: cerrar sesión dos veces no es error.
  return json({ ok: true }, { headers: { 'Set-Cookie': clearedSessionCookie() } })
}
