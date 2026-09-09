/**
 * Sesión del lado del servidor.
 *
 * La sesión **no caduca por tiempo** (decisión de producto): la cookie se emite
 * a diez años y la fila de `sessions` vive hasta que el usuario cierra sesión o
 * el admin desactiva la cuenta. Es cómodo en las tablets de la casa, que es
 * donde se juega; a cambio, cerrar sesión es la única forma de soltar un
 * aparato, y por eso está a la vista en Ajustes.
 */

import { hashToken } from './crypto'
import type { D1Database, Env } from './types'

export const SESSION_COOKIE = 'lg_session'

/** Diez años. Es lo más cerca de "para siempre" que entiende un navegador. */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 10

export interface UserRow {
  id: string
  email: string
  full_name: string
  username: string
  password_hash: string
  role: 'admin' | 'player'
  is_active: number
  created_at: string
}

export interface PublicUser {
  id: string
  email: string
  fullName: string
  username: string
  role: 'admin' | 'player'
  isActive: boolean
  createdAt: string
}

export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    username: row.username,
    role: row.role,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
  }
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('Cookie')

  if (!header) return null

  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }

  return null
}

export function sessionCookie(token: string): string {
  // Secure + HttpOnly: la cookie no se lee desde JS ni viaja por http.
  // SameSite=Lax deja que la PWA la mande al abrirse desde el icono.
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}`
}

export function clearedSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
}

/**
 * Devuelve el usuario de la petición, o null. Una cuenta desactivada por el
 * admin deja de tener sesión al instante, aunque la cookie siga siendo válida.
 */
export async function currentUser(request: Request, env: Env): Promise<UserRow | null> {
  const token = readCookie(request, SESSION_COOKIE)

  if (!token) return null

  const row = await env.DB.prepare(
    `SELECT u.* FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.id = ? AND u.is_active = 1`
  )
    .bind(await hashToken(token))
    .first<UserRow>()

  return row ?? null
}

export async function createSession(db: D1Database, userId: string, token: string): Promise<void> {
  await db
    .prepare('INSERT INTO sessions (id, user_id, created_at) VALUES (?, ?, ?)')
    .bind(await hashToken(token), userId, new Date().toISOString())
    .run()
}

export async function destroySession(db: D1Database, token: string): Promise<void> {
  await db
    .prepare('DELETE FROM sessions WHERE id = ?')
    .bind(await hashToken(token))
    .run()
}

export function readSessionToken(request: Request): string | null {
  return readCookie(request, SESSION_COOKIE)
}

/* ---------------------------------------------------------------------- */
/* Validación de altas                                                     */
/* ---------------------------------------------------------------------- */

/** Reglas del PRODUCT_SPEC §5: 4 o más, solo letras o números. */
export function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string' || !/^[A-Za-z0-9]{4,64}$/.test(password)) {
    return 'La contraseña debe tener 4 o más caracteres, solo letras y números.'
  }

  return null
}

export function validateUsername(username: unknown): string | null {
  if (typeof username !== 'string' || !/^[A-Za-z0-9_.-]{3,24}$/.test(username)) {
    return 'El usuario debe tener de 3 a 24 caracteres, sin espacios.'
  }

  return null
}

export function validateEmail(email: unknown): string | null {
  if (
    typeof email !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 120
  ) {
    return 'El correo no es válido.'
  }

  return null
}

export function validateFullName(fullName: unknown): string | null {
  if (typeof fullName !== 'string' || fullName.trim().length < 2 || fullName.length > 80) {
    return 'El nombre completo es obligatorio.'
  }

  return null
}
