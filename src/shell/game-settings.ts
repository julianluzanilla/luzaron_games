/**
 * Juegos activos — interruptor global del admin.
 *
 * El servidor solo guarda los juegos que el admin tocó; lo que no viene está
 * activo. La última respuesta se guarda en localStorage para que, en modo
 * avión, la home enseñe lo mismo que la última vez. Si nunca se descargó, todo
 * está activo.
 *
 * Desactivar un juego solo lo oculta a los jugadores. El admin lo sigue viendo
 * (marcado «Oculto») para poder probarlo.
 */

import { apiGameSettings, apiSetGameEnabled } from './api'
import type { GameId } from './games'

const STORAGE_KEY = 'luzaron-games-enabled-v1'

let overrides: Record<string, boolean> = readStored()
const listeners = new Set<() => void>()

function readStored(): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, boolean>) : {}
  } catch {
    return {}
  }
}

function store(next: Record<string, boolean>): void {
  const changed = JSON.stringify(next) !== JSON.stringify(overrides)
  overrides = next

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Sin almacenamiento: vale la copia en memoria.
  }

  if (changed) listeners.forEach((listener) => listener())
}

export function isGameEnabled(id: GameId): boolean {
  return overrides[id] !== false
}

export function onGameSettingsChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Pide al servidor la configuración vigente. Sin red se queda con la guardada. */
export async function refreshGameSettings(): Promise<void> {
  try {
    const { games } = await apiGameSettings()
    store(games)
  } catch {
    // Offline o backend sin la tabla: se queda lo último conocido.
  }
}

/** Solo admin. Lanza el error de la API para que el panel lo enseñe. */
export async function setGameEnabled(id: GameId, enabled: boolean): Promise<void> {
  await apiSetGameEnabled(id, enabled)
  store({ ...overrides, [id]: enabled })
}

export function initGameSettings(): void {
  void refreshGameSettings()
  window.addEventListener('online', () => void refreshGameSettings())
}
