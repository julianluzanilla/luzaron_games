/**
 * Sesión del jugador.
 *
 * Reglas acordadas:
 * - Se entra jugando: sin sesión el usuario es **Invitado** y no se le pide nada.
 * - La sesión **no caduca**; solo termina cuando el usuario cierra sesión.
 * - Offline sigues siendo tú: el perfil queda cacheado en IndexedDB, así que la
 *   app te identifica y guarda tus récords aunque no haya red (se suben luego).
 *
 * El servidor es la autoridad, pero solo cuando contesta: si `/auth/me` falla
 * por falta de red se conserva el perfil cacheado. Solo un 401 explícito, que
 * significa "esta cookie ya no vale", cierra la sesión local.
 */

import { apiLogin, apiLogout, apiMe, apiSetup, OfflineError, type ApiUser } from './api'
import { readCachedUser, writeCachedUser } from './db'

export interface SessionState {
  user: ApiUser | null
  /** true mientras no se sabe si hay sesión (primer arranque). */
  loading: boolean
  /** El backend no tiene ningún usuario todavía: hay que crear el admin. */
  needsSetup: boolean
  /** false cuando la última llamada al backend murió por falta de red. */
  serverReachable: boolean
}

const state: SessionState = {
  user: null,
  loading: true,
  needsSetup: false,
  serverReachable: true,
}

const listeners = new Set<(state: SessionState) => void>()

function emit(): void {
  listeners.forEach((listener) => listener({ ...state }))
}

export function onSessionChange(listener: (state: SessionState) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSession(): SessionState {
  return { ...state }
}

export function getCurrentUser(): ApiUser | null {
  return state.user
}

export function isGuest(): boolean {
  return state.user === null
}

export function isAdmin(): boolean {
  return state.user?.role === 'admin'
}

/** Nombre para el header: el de pila del usuario, o "Invitado". */
export function displayName(): string {
  if (!state.user) return 'Invitado'
  return state.user.fullName.split(' ')[0] || state.user.username
}

/**
 * Arranque. Primero pinta con lo que haya en caché (instantáneo y sirve sin
 * red) y después confirma contra el servidor.
 */
export async function initSession(): Promise<void> {
  const cached = await readCachedUser()

  if (cached) {
    state.user = cached
    state.loading = false
    emit()
  }

  try {
    const { user, needsSetup } = await apiMe()

    state.serverReachable = true
    state.needsSetup = needsSetup
    state.user = user
    await writeCachedUser(user)
  } catch (error) {
    if (error instanceof OfflineError) {
      // Sin red: nos quedamos con el perfil cacheado, si lo había.
      state.serverReachable = false
    } else {
      // El servidor contestó que esta cookie ya no vale.
      state.user = null
      await writeCachedUser(null)
    }
  }

  state.loading = false
  emit()
}

export async function login(username: string, password: string): Promise<void> {
  const { user } = await apiLogin(username, password)

  state.user = user
  state.serverReachable = true
  state.needsSetup = false
  await writeCachedUser(user)
  emit()
}

export async function setupFirstAdmin(input: {
  email: string
  fullName: string
  username: string
  password: string
}): Promise<void> {
  const { user } = await apiSetup(input)

  state.user = user
  state.needsSetup = false
  await writeCachedUser(user)
  emit()
}

/**
 * Cierra sesión. Se intenta avisar al servidor para que borre el token, pero
 * si no hay red se cierra igual en local: el usuario pidió salir.
 */
export async function logout(): Promise<void> {
  try {
    await apiLogout()
  } catch {
    // Sin red: la cookie se queda viva en el servidor hasta la próxima vez
    // que este aparato entre. Aceptable para una app familiar.
  }

  state.user = null
  await writeCachedUser(null)
  emit()
}

/** Refresca el perfil cacheado (por ejemplo tras un cambio del admin). */
export async function refreshSession(): Promise<void> {
  try {
    const { user, needsSetup } = await apiMe()

    state.serverReachable = true
    state.needsSetup = needsSetup
    state.user = user
    await writeCachedUser(user)
    emit()
  } catch (error) {
    if (error instanceof OfflineError) {
      state.serverReachable = false
      emit()
    }
  }
}
