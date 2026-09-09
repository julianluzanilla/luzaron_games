/**
 * PATCH /api/users/:id — activar, desactivar, cambiar rol o reponer contraseña.
 * Solo admin.
 */

import {
  currentUser,
  toPublicUser,
  validateFullName,
  validatePassword,
  type UserRow,
} from '../../_lib/auth'
import { hashPassword } from '../../_lib/crypto'
import {
  badRequest,
  fail,
  forbidden,
  json,
  notFound,
  readJson,
  unauthorized,
} from '../../_lib/http'
import type { PagesFunction } from '../../_lib/types'

interface PatchBody {
  isActive?: unknown
  role?: unknown
  password?: unknown
  fullName?: unknown
}

export const onRequestPatch: PagesFunction = async ({ request, env, params }) => {
  const me = await currentUser(request, env)

  if (!me) return unauthorized()
  if (me.role !== 'admin') return forbidden()

  const id = Array.isArray(params.id) ? params.id[0] : params.id
  const target = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>()

  if (!target) return notFound()

  const body = await readJson<PatchBody>(request)

  if (!body) return badRequest('No se recibió nada que cambiar.')

  // Un admin no puede desactivarse ni degradarse a sí mismo: si es el único,
  // la app se quedaría sin nadie que pueda administrarla.
  if (target.id === me.id && (body.isActive === false || body.role === 'player')) {
    return fail(409, 'self_lockout', 'No puedes quitarte a ti mismo el acceso de administrador.')
  }

  const updates: string[] = []
  const values: unknown[] = []

  if (typeof body.isActive === 'boolean') {
    updates.push('is_active = ?')
    values.push(body.isActive ? 1 : 0)
  }

  if (body.role === 'admin' || body.role === 'player') {
    updates.push('role = ?')
    values.push(body.role)
  }

  if (body.fullName !== undefined) {
    const problem = validateFullName(body.fullName)
    if (problem) return badRequest(problem)

    updates.push('full_name = ?')
    values.push(String(body.fullName).trim())
  }

  if (body.password !== undefined) {
    const problem = validatePassword(body.password)
    if (problem) return badRequest(problem)

    updates.push('password_hash = ?')
    values.push(await hashPassword(String(body.password)))
  }

  if (updates.length === 0) return badRequest('No se recibió nada que cambiar.')

  await env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values, id)
    .run()

  // Desactivar una cuenta, o cambiarle la contraseña a otro, la echa de todos
  // sus aparatos ahora mismo. Si el admin se cambió su propia contraseña no se
  // cierra su sesión: acaba de demostrar que es él.
  const revokeSessions =
    body.isActive === false || (body.password !== undefined && target.id !== me.id)

  if (revokeSessions) {
    await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id).run()
  }

  const updated = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>()

  if (!updated) return notFound()

  return json({ user: toPublicUser(updated) })
}
