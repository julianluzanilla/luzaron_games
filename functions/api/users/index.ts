/**
 * /api/users — alta y listado de la familia. Solo admin.
 *
 * No hay auto-registro ni códigos de invitación: el administrador crea cada
 * cuenta a mano (PRODUCT_SPEC §5).
 */

import {
  currentUser,
  toPublicUser,
  validateEmail,
  validateFullName,
  validatePassword,
  validateUsername,
  type UserRow,
} from '../../_lib/auth'
import { hashPassword, newId } from '../../_lib/crypto'
import { badRequest, fail, forbidden, json, readJson, unauthorized } from '../../_lib/http'
import type { PagesFunction } from '../../_lib/types'

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const me = await currentUser(request, env)

  if (!me) return unauthorized()
  if (me.role !== 'admin') return forbidden()

  const { results } = await env.DB.prepare(
    'SELECT * FROM users ORDER BY role DESC, full_name COLLATE NOCASE'
  ).all<UserRow>()

  return json({ users: results.map(toPublicUser) })
}

interface CreateBody {
  email?: unknown
  fullName?: unknown
  username?: unknown
  password?: unknown
  role?: unknown
}

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const me = await currentUser(request, env)

  if (!me) return unauthorized()
  if (me.role !== 'admin') return forbidden()

  const body = await readJson<CreateBody>(request)

  const problem =
    validateFullName(body?.fullName) ??
    validateEmail(body?.email) ??
    validateUsername(body?.username) ??
    validatePassword(body?.password)

  if (problem) return badRequest(problem)

  const role = body?.role === 'admin' ? 'admin' : 'player'
  const email = String(body?.email).trim().toLowerCase()
  const username = String(body?.username).trim()

  const clash = await env.DB.prepare(
    'SELECT id FROM users WHERE username = ? COLLATE NOCASE OR email = ?'
  )
    .bind(username, email)
    .first<{ id: string }>()

  if (clash) return fail(409, 'duplicate', 'Ese usuario o ese correo ya existen.')

  const id = newId('usr')

  await env.DB.prepare(
    `INSERT INTO users (id, email, full_name, username, password_hash, role, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
  )
    .bind(
      id,
      email,
      String(body?.fullName).trim(),
      username,
      await hashPassword(String(body?.password)),
      role,
      new Date().toISOString()
    )
    .run()

  const row = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>()

  if (!row) return fail(500, 'server_error', 'No se pudo crear el usuario.')

  return json({ user: toPublicUser(row) }, { status: 201 })
}
