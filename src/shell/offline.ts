/**
 * Estado offline de la app: ¿hay internet? y ¿está todo guardado en el aparato?
 *
 * - `online`: navigator.onLine + los eventos online/offline. Si el backend no
 *   contesta (session.serverReachable) también cuenta como desconectado.
 * - `ready`: el service worker confirmó que TODO el build está en la caché, o
 *   sea que la app abre y se juega en modo avión.
 *
 * El ícono de usuario y su menú se pintan desde aquí (ver user-menu.ts):
 *   Desconectado  → sin internet
 *   Actualizado   → con internet y todo descargado
 *   Actualizando  → con internet, todavía bajando la app o una versión nueva
 */

import { getSession, onSessionChange, refreshSession } from './session'

export type SyncStatus = 'updated' | 'updating' | 'offline'

export interface OfflineState {
  online: boolean
  ready: boolean
  /** Versión que está guardada en el aparato (puede ser más nueva que la que corre). */
  cachedVersion: string | null
}

const state: OfflineState = {
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  ready: false,
  cachedVersion: null,
}

const listeners = new Set<(state: OfflineState) => void>()

function emit(): void {
  listeners.forEach((listener) => listener({ ...state }))
}

function set(patch: Partial<OfflineState>): void {
  const changed = (Object.keys(patch) as (keyof OfflineState)[]).some(
    (key) => state[key] !== patch[key]
  )
  if (!changed) return

  Object.assign(state, patch)
  emit()
}

export function getOfflineState(): OfflineState {
  return { ...state }
}

export function onOfflineChange(listener: (state: OfflineState) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Lo que se enseña en el menú. */
export function syncStatus(): SyncStatus {
  const reachable = getSession().serverReachable

  if (!state.online || !reachable) return 'offline'
  return state.ready ? 'updated' : 'updating'
}

export const SYNC_LABEL: Record<SyncStatus, string> = {
  updated: 'Actualizado',
  updating: 'Actualizando',
  offline: 'Desconectado',
}

/* ---------------------------------------------------------------------- */
/* Service worker                                                          */
/* ---------------------------------------------------------------------- */

function askStatus(): void {
  navigator.serviceWorker.controller?.postMessage({ type: 'GET_STATUS' })
}

function watchInstalling(worker: ServiceWorker | null): void {
  if (!worker) return

  set({ ready: false })

  worker.addEventListener('statechange', () => {
    if (worker.state === 'activated') askStatus()
    // 'redundant' = la instalación falló (p. ej. se fue la red a medias). Se
    // reintenta sola en la próxima apertura; mientras, sigue "Actualizando".
  })
}

async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return

  navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as { type?: string; ready?: boolean; version?: string } | null
    if (data?.type !== 'SW_STATUS') return

    set({ ready: Boolean(data.ready), cachedVersion: data.version ?? null })
  })

  // Al tomar el control el SW nuevo (primera instalación o una actualización).
  // NO se recarga: la versión nueva entra la próxima vez que se abra la app.
  navigator.serviceWorker.addEventListener('controllerchange', askStatus)

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    })

    watchInstalling(registration.installing ?? registration.waiting)
    registration.addEventListener('updatefound', () => watchInstalling(registration.installing))

    if (navigator.serviceWorker.controller) askStatus()

    // En iPhone la app casi nunca se "recarga": vuelve del fondo. Ahí se busca
    // versión nueva, igual que al abrirla.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        void registration.update().catch(() => undefined)
      }
    })
  } catch (error) {
    console.warn('No se pudo registrar el service worker.', error)
  }
}

export function initOffline(): void {
  window.addEventListener('online', () => {
    set({ online: true })
    // Volvió la red (aterrizamos): se confirma la sesión con el servidor.
    void refreshSession()
  })
  window.addEventListener('offline', () => set({ online: false }))

  // serverReachable vive en la sesión; cuando cambia hay que repintar el estado.
  onSessionChange(() => emit())

  void registerServiceWorker()
}
