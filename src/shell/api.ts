/**
 * Cliente HTTP del backend (Cloudflare Pages Functions + D1).
 *
 * Todo va contra el mismo origen (`/api/...`) con la cookie de sesión, así que
 * no hay tokens que manejar en el cliente. Cada llamada puede fallar por falta
 * de red: los que llaman deben tratarlo como "sigo offline", nunca como
 * "el usuario se desconectó".
 */

export type UserRole = 'admin' | 'player'

export interface ApiUser {
  id: string
  email: string
  fullName: string
  username: string
  role: UserRole
  isActive: boolean
  createdAt: string
}

export interface ApiRecord {
  id: string
  gameId: string
  packId: string
  levelId: string
  rawTimeMs: number
  finalTimeMs: number
  hintsUsed: number
  hintPenaltyMs: number
  isCleanRecord: boolean
  completedAt: string
}

export interface RankingRow {
  username: string
  fullName: string
  finalTimeMs: number
  completedAt: string
}

/** Error con el código que devolvió el backend, para dar mensajes concretos. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

/** Se lanza cuando no hubo respuesta del servidor (avión, túnel, wifi caído). */
export class OfflineError extends Error {
  constructor() {
    super('Sin conexión')
    this.name = 'OfflineError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response

  try {
    response = await fetch(`/api${path}`, {
      credentials: 'same-origin',
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
      ...init,
    })
  } catch {
    throw new OfflineError()
  }

  if (response.status === 204) return undefined as T

  let payload: unknown = null

  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    const body = (payload ?? {}) as { error?: string; message?: string }
    throw new ApiError(
      response.status,
      body.error ?? 'unknown',
      body.message ?? 'No se pudo completar la operación.'
    )
  }

  return payload as T
}

/* ---------------------------------------------------------------------- */
/* Sesión                                                                  */
/* ---------------------------------------------------------------------- */

export function apiMe(): Promise<{ user: ApiUser | null; needsSetup: boolean }> {
  return request('/auth/me')
}

export function apiLogin(username: string, password: string): Promise<{ user: ApiUser }> {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export function apiLogout(): Promise<void> {
  return request('/auth/logout', { method: 'POST' })
}

/** Crea el primer admin. El backend solo lo permite si no hay ningún usuario. */
export function apiSetup(input: {
  email: string
  fullName: string
  username: string
  password: string
}): Promise<{ user: ApiUser }> {
  return request('/auth/setup', { method: 'POST', body: JSON.stringify(input) })
}

/* ---------------------------------------------------------------------- */
/* Usuarios (solo admin)                                                   */
/* ---------------------------------------------------------------------- */

export function apiListUsers(): Promise<{ users: ApiUser[] }> {
  return request('/users')
}

export function apiCreateUser(input: {
  email: string
  fullName: string
  username: string
  password: string
  role: UserRole
}): Promise<{ user: ApiUser }> {
  return request('/users', { method: 'POST', body: JSON.stringify(input) })
}

export function apiUpdateUser(
  id: string,
  input: Partial<{ isActive: boolean; role: UserRole; password: string; fullName: string }>
): Promise<{ user: ApiUser }> {
  return request(`/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

/* ---------------------------------------------------------------------- */
/* Records                                                                 */
/* ---------------------------------------------------------------------- */

export interface RecordUpload {
  clientId: string
  gameId: string
  packId: string
  levelId: string
  rawTimeMs: number
  finalTimeMs: number
  hintsUsed: number
  hintPenaltyMs: number
  isCleanRecord: boolean
  completedAt: string
}

/**
 * Sube la cola de records. `clientId` hace la operación idempotente: si un
 * record ya se había subido, el backend lo ignora en vez de duplicarlo.
 */
export function apiPushRecords(records: RecordUpload[]): Promise<{ accepted: string[] }> {
  return request('/records', { method: 'POST', body: JSON.stringify({ records }) })
}

/** Mejores tiempos del usuario, uno por `gameId + packId + levelId`. */
export function apiBestTimes(): Promise<{
  bests: { gameId: string; packId: string; levelId: string; finalTimeMs: number }[]
}> {
  return request('/records/bests')
}

export function apiRanking(
  gameId: string,
  packId: string,
  levelId: string
): Promise<{ rows: RankingRow[] }> {
  const query = new URLSearchParams({ game: gameId, pack: packId, level: levelId })
  return request(`/rankings?${query.toString()}`)
}
