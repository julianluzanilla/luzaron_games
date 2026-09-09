/**
 * Tema claro / oscuro / automático.
 *
 * La preferencia se guarda en localStorage y se aplica poniendo
 * `data-theme="light" | "dark"` en <html>. En modo `auto` no se escribe una
 * preferencia fija: se sigue a `prefers-color-scheme` y se reacciona en vivo
 * si el sistema cambia (el iPhone lo hace solo al anochecer).
 *
 * index.html trae un script mínimo que aplica el tema ANTES de pintar, para
 * que no haya un destello blanco al abrir la app en modo oscuro. Este módulo
 * usa las mismas llaves; si cambias una, cambia también la del HTML.
 */

export type ThemePreference = 'auto' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'luzaron-theme-v1'

/** Colores de la barra del navegador/PWA, uno por tema resuelto. */
const THEME_COLOR: Record<ResolvedTheme, string> = {
  dark: '#0b1220',
  light: '#f4f6fb',
}

const listeners = new Set<(resolved: ResolvedTheme) => void>()

let preference: ThemePreference = readPreference()
let mediaQuery: MediaQueryList | null = null

function readPreference(): ThemePreference {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'auto') return raw
  } catch {
    // Sin almacenamiento (Safari privado): se queda en automático.
  }

  return 'auto'
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function getThemePreference(): ThemePreference {
  return preference
}

export function getResolvedTheme(): ResolvedTheme {
  return preference === 'auto' ? systemTheme() : preference
}

function apply(): void {
  const resolved = getResolvedTheme()
  const root = document.documentElement

  root.dataset.theme = resolved
  root.style.colorScheme = resolved

  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (meta) meta.content = THEME_COLOR[resolved]

  listeners.forEach((listener) => listener(resolved))
}

export function setThemePreference(next: ThemePreference): void {
  preference = next

  try {
    window.localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Sin almacenamiento: el tema dura lo que dure la pestaña.
  }

  apply()
}

/** Avisa cada vez que cambia el tema efectivo (incluido el cambio del sistema). */
export function onThemeChange(listener: (resolved: ResolvedTheme) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function initTheme(): void {
  if (!mediaQuery && window.matchMedia) {
    mediaQuery = window.matchMedia('(prefers-color-scheme: light)')
    mediaQuery.addEventListener('change', () => {
      if (preference === 'auto') apply()
    })
  }

  apply()
}

export const THEME_OPTIONS: { value: ThemePreference; label: string; hint: string }[] = [
  { value: 'auto', label: 'Automático', hint: 'Sigue al sistema' },
  { value: 'light', label: 'Claro', hint: 'Siempre de día' },
  { value: 'dark', label: 'Oscuro', hint: 'Siempre de noche' },
]
