/**
 * /api/auth/me
 *
 * GET   — quién es el que pregunta, y si falta crear el admin.
 * PATCH — el propio usuario edita su nombre visible y/o su contraseña
 *         ("Editar usuario" en el menú del ícono). Cambiar la contraseña pide
 *         la actual y cierra la sesión en los demás aparatos, no en éste.
 */

import {
  currentUser,
  readSessionToken,
  toPublicUser,
  validateFullName,
  validatePassword,
  type UserRow,
} from '../../_lib/auth'
import { hashPassword, hashToken, verifyPassword } from '../../_lib/crypto'
import { badRequest, fail, json, readJson, unauthorized } from '../../_lib/http'
import type { PagesFunction } from '../../_lib/types'

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const user = await currentUser(request, env)

  if (user) return json({ user: toPublicUser(user), needsSetup: false })

  // Sin sesión: se avisa si la base está vacía, para que Ajustes ofrezca crear
  // el primer administrador en vez de un login imposible.
  const row = await env.DB.prepare('SELECT COUNT(*) AS total FROM users').first<{ total: number }>()

  return json({ user: null, needsSetup: (row?.total ?? 0) === 0 })
}

interface PatchBody {
  fullName?: unknown
  currentPassword?: unknown
  newPassword?: unknown
}

export const onRequestPatch: PagesFunction = async ({ request, env }) => {
  const me = await currentUser(request, env)

  if (!me) return unauthorized()

  const body = await readJson<PatchBody>(request)

  if (!body) return badRequest('No se recibió nada que cambiar.')

  const updates: string[] = []
  const values: unknown[] = []

  if (body.fullName !== undefined) {
    const problem = validateFullName(body.fullName)
    if (problem) return badRequest(problem)

    updates.push('full_name = ?')
    values.push(String(body.fullName).trim())
  }

  const changingPassword = body.newPassword !== undefined && body.newPassword !== ''

  if (changingPassword) {
    if (
      typeof body.currentPassword !== 'string' ||
      !(await verifyPassword(body.currentPassword, me.password_hash))
    ) {
      return fail(403, 'wrong_password', 'La contraseña actual no es correcta.')
    }

    const problem = validatePassword(body.newPassword)
    if (problem) return badRequest(problem)

    updates.push('password_hash = ?')
    values.push(await hashPassword(String(body.newPassword)))
  }

  if (updates.length === 0) return badRequest('No se recibió nada que cambiar.')

  await env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values, me.id)
    .run()

  if (changingPassword) {
    const token = readSessionToken(request)
    const keep = token ? await hashToken(token) : ''

    await env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND id <> ?')
      .bind(me.id, keep)
      .run()
  }

  const updated = await env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(me.id)
    .first<UserRow>()

  if (!updated) return unauthorized()

  return json({ user: toPublicUser(updated) })
}
