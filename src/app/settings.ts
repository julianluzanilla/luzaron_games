export type ThemeMode = 'light' | 'dark' | 'system'

export interface UserSettings {
  themeMode: ThemeMode
  soundEnabled: boolean
  vibrationEnabled: boolean
  reducedMotion: boolean
}

const SETTINGS_STORAGE_KEY = 'luzaron-games-settings'

const defaultSettings: UserSettings = {
  themeMode: 'system',
  soundEnabled: true,
  vibrationEnabled: true,
  reducedMotion: false,
}

export function getDefaultSettings(): UserSettings {
  return { ...defaultSettings }
}

export function loadSettings(): UserSettings {
  const rawSettings = window.localStorage.getItem(SETTINGS_STORAGE_KEY)

  if (!rawSettings) {
    return getDefaultSettings()
  }

  try {
    const parsedSettings = JSON.parse(rawSettings) as Partial<UserSettings>

    return {
      ...defaultSettings,
      ...parsedSettings,
    }
  } catch {
    return getDefaultSettings()
  }
}

export function saveSettings(settings: UserSettings): void {
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
}

export function resolveThemeMode(themeMode: ThemeMode): 'light' | 'dark' {
  if (themeMode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  return themeMode
}

export function applyTheme(settings: UserSettings): void {
  const resolvedTheme = resolveThemeMode(settings.themeMode)

  document.documentElement.dataset.theme = resolvedTheme
  document.documentElement.dataset.themeMode = settings.themeMode
  document.documentElement.dataset.reducedMotion = settings.reducedMotion ? 'true' : 'false'
}
