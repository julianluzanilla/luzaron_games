/**
 * POST /api/auth/setup — crea el primer administrador.
 *
 * Solo funciona mientras la tabla `users` esté vacía. En cuanto existe un
 * usuario, este endpoint queda cerrado para siempre: es lo que evita que
 * cualquiera que encuentre la URL se haga administrador de la app familiar.
 * A partir de ahí las altas van por /api/users, que exige rol admin.
 */

import {
  createSession,
  sessionCookie,
  toPublicUser,
  validateEmail,
  validateFullName,
  validatePassword,
  validateUsername,
  type UserRow,
} from '../../_lib/auth'
import { hashPassword, newId, newSessionToken } from '../../_lib/crypto'
import { badRequest, fail, json, readJson } from '../../_lib/http'
import type { PagesFunction } from '../../_lib/types'

interface SetupBody {
  email?: unknown
  fullName?: unknown
  username?: unknown
  password?: unknown
}

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const existing = await env.DB.prepare('SELECT COUNT(*) AS total FROM users').first<{
    total: number
  }>()

  if ((existing?.total ?? 0) > 0) {
    return fail(409, 'already_setup', 'La app ya tiene usuarios. Pide tu cuenta al administrador.')
  }

  const body = await readJson<SetupBody>(request)

  const problem =
    validateFullName(body?.fullName) ??
    validateEmail(body?.email) ??
    validateUsername(body?.username) ??
    validatePassword(body?.password)

  if (problem) return badRequest(problem)

  const id = newId('usr')
  const now = new Date().toISOString()

  await env.DB.prepare(
    `INSERT INTO users (id, email, full_name, username, password_hash, role, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, 'admin', 1, ?)`
  )
    .bind(
      id,
      String(body?.email).trim().toLowerCase(),
      String(body?.fullName).trim(),
      String(body?.username).trim(),
      await hashPassword(String(body?.password)),
      now
    )
    .run()

  const row = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>()

  if (!row) return fail(500, 'server_error', 'No se pudo crear el usuario.')

  const token = newSessionToken()
  await createSession(env.DB, id, token)

  return json({ user: toPublicUser(row) }, { headers: { 'Set-Cookie': sessionCookie(token) } })
}
