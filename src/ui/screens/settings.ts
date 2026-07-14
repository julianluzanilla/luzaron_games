import type { AppState } from '../../app/types'
import type { ThemeMode } from '../../app/settings'

function isThemeSelected(currentTheme: ThemeMode, theme: ThemeMode): string {
  return currentTheme === theme ? 'checked' : ''
}

function isChecked(value: boolean): string {
  return value ? 'checked' : ''
}

export function renderSettingsScreen(state: AppState): string {
  return `
    <section class="screen content-screen">
      <div class="section-header">
        <p class="eyebrow">Preferencias</p>
        <h1>Ajustes</h1>
        <p>
          Configura la apariencia y las preferencias básicas de juego.
        </p>
      </div>

      <div class="settings-panel">
        <fieldset class="settings-group">
          <legend>Tema</legend>

          <label class="option-row">
            <input
              type="radio"
              name="themeMode"
              value="system"
              ${isThemeSelected(state.settings.themeMode, 'system')}
            />
            <span>Automático del sistema</span>
          </label>

          <label class="option-row">
            <input
              type="radio"
              name="themeMode"
              value="dark"
              ${isThemeSelected(state.settings.themeMode, 'dark')}
            />
            <span>Oscuro</span>
          </label>

          <label class="option-row">
            <input
              type="radio"
              name="themeMode"
              value="light"
              ${isThemeSelected(state.settings.themeMode, 'light')}
            />
            <span>Claro</span>
          </label>
        </fieldset>

        <fieldset class="settings-group">
          <legend>Juego</legend>

          <label class="option-row">
            <input
              type="checkbox"
              name="soundEnabled"
              ${isChecked(state.settings.soundEnabled)}
            />
            <span>Sonido</span>
          </label>

          <label class="option-row">
            <input
              type="checkbox"
              name="vibrationEnabled"
              ${isChecked(state.settings.vibrationEnabled)}
            />
            <span>Vibración</span>
          </label>

          <label class="option-row">
            <input
              type="checkbox"
              name="reducedMotion"
              ${isChecked(state.settings.reducedMotion)}
            />
            <span>Reducir animaciones</span>
          </label>
        </fieldset>
      </div>
    </section>
  `
}
