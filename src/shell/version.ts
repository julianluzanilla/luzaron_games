/**
 * Versión del sistema.
 *
 * La calcula vite.config.js en cada build: fecha y hora del último commit (hora
 * de Hermosillo) + hash corto, p. ej. `2026.09.26 14:32 · a3f9c1e`. El mismo
 * objeto se publica en `/version.json` para comparar contra lo instalado.
 */

export interface AppVersion {
  /** Lo que se enseña: `2026.09.26 14:32 · a3f9c1e`. */
  label: string
  commit: string
  /** ISO del commit (o del build, si no había git). */
  date: string
  fromGit: boolean
}

declare const __APP_VERSION__: AppVersion

export const APP_VERSION: AppVersion =
  typeof __APP_VERSION__ === 'undefined'
    ? { label: 'desarrollo', commit: 'local', date: new Date().toISOString(), fromGit: false }
    : __APP_VERSION__

/** Lo publicado en el servidor, o null sin red. */
export async function fetchPublishedVersion(): Promise<AppVersion | null> {
  try {
    const response = await fetch('/version.json', { cache: 'no-store' })
    if (!response.ok) return null
    return (await response.json()) as AppVersion
  } catch {
    return null
  }
}
