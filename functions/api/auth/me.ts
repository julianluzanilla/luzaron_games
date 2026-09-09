/** GET /api/auth/me — quién es el que pregunta, y si falta crear el admin. */

import { currentUser, toPublicUser } from '../../_lib/auth'
import { json } from '../../_lib/http'
import type { PagesFunction } from '../../_lib/types'

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const user = await currentUser(request, env)

  if (user) return json({ user: toPublicUser(user), needsSetup: false })

  // Sin sesión: se avisa si la base está vacía, para que Ajustes ofrezca crear
  // el primer administrador en vez de un login imposible.
  const row = await env.DB.prepare('SELECT COUNT(*) AS total FROM users').first<{ total: number }>()

  return json({ user: null, needsSetup: (row?.total ?? 0) === 0 })
}
