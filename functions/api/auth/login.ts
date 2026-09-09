/** POST /api/auth/login — usuario + contraseña simple. */

import { createSession, sessionCookie, toPublicUser, type UserRow } from '../../_lib/auth'
import { newSessionToken, verifyPassword } from '../../_lib/crypto'
import { badRequest, fail, json, readJson } from '../../_lib/http'
import type { PagesFunction } from '../../_lib/types'

interface LoginBody {
  username?: unknown
  password?: unknown
}

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const body = await readJson<LoginBody>(request)

  if (typeof body?.username !== 'string' || typeof body?.password !== 'string') {
    return badRequest('Faltan el usuario o la contraseña.')
  }

  const row = await env.DB.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE')
    .bind(body.username.trim())
    .first<UserRow>()

  // Mismo mensaje para "no existe" y "contraseña mala": si fueran distintos,
  // cualquiera podría averiguar qué usuarios existen probando nombres.
  const invalid = fail(401, 'invalid_credentials', 'Usuario o contraseña incorrectos.')

  if (!row) {
    // Se verifica igual contra un hash de mentira para que la respuesta tarde
    // lo mismo que con un usuario real y no se pueda distinguir por el tiempo.
    await verifyPassword(body.password, 'pbkdf2$sha256$210000$AAAAAAAAAAAAAAAAAAAAAA==$AAAA')
    return invalid
  }

  if (row.is_active !== 1) {
    return fail(403, 'inactive', 'Esta cuenta está desactivada. Habla con el administrador.')
  }

  if (!(await verifyPassword(body.password, row.password_hash))) return invalid

  const token = newSessionToken()
  await createSession(env.DB, row.id, token)

  return json({ user: toPublicUser(row) }, { headers: { 'Set-Cookie': sessionCookie(token) } })
}
