import './style.css'

import { isPlayableGameId, type GameId } from './shell/games'
import { getResolvedTheme, initTheme, onThemeChange, setThemePreference } from './shell/theme'
import { renderThemeToggleContent, themeToggleLabel } from './shell/app-header'
import { initSession, isAdmin, getSession, onSessionChange } from './shell/session'
import { initRecords } from './shell/records'
import { initOffline } from './shell/offline'
import { initUserMenu } from './shell/user-menu'
import { initGameSettings, isGameEnabled, onGameSettingsChange } from './shell/game-settings'
import { mountAccountApp, unmountAccountApp } from './shell/account-app'
import { mountHomeApp, unmountHomeApp } from './shell/home-app'
import { mountSettingsApp, unmountSettingsApp } from './shell/settings-app'
import { mountAdminApp, unmountAdminApp } from './shell/admin-app'
import { mountQueensApp, unmountQueensApp } from './queens-app'
import { mountSudokuApp, unmountSudokuApp } from './sudoku-app'
import { mountWordleApp, unmountWordleApp } from './wordle-app'
import { mountMahjongApp, unmountMahjongApp } from './mahjong-app'
import { mountZipApp, unmountZipApp } from './zip-app'
import { mountMemoriaApp, unmountMemoriaApp } from './memoria-app'

/**
 * Router de la app.
 *
 * La raíz (`#/`) es la pantalla de inicio con las miniaturas; cada juego
 * y cada pantalla interna viven en su propia ruta de hash. El hash basta porque
 * Cloudflare Pages sirve un solo `index.html` y así no hace falta configurar
 * reescrituras del servidor.
 */

type Route = 'home' | 'settings' | 'account' | 'admin' | GameId

interface Screen {
  mount: () => void
  unmount: () => void
}

const SCREENS: Record<Route, Screen> = {
  home: { mount: mountHomeApp, unmount: unmountHomeApp },
  settings: { mount: mountSettingsApp, unmount: unmountSettingsApp },
  account: { mount: mountAccountApp, unmount: unmountAccountApp },
  admin: { mount: mountAdminApp, unmount: unmountAdminApp },
  queens: { mount: mountQueensApp, unmount: unmountQueensApp },
  sudoku: { mount: mountSudokuApp, unmount: unmountSudokuApp },
  wordle: { mount: mountWordleApp, unmount: unmountWordleApp },
  mahjong: { mount: mountMahjongApp, unmount: unmountMahjongApp },
  zip: { mount: mountZipApp, unmount: unmountZipApp },
  memoria: { mount: mountMemoriaApp, unmount: unmountMemoriaApp },
}

/** Nombre de la ruta en la URL. Se traduce solo lo que el usuario puede leer. */
const HASH_OF: Record<Route, string> = {
  home: '#/',
  settings: '#/ajustes',
  account: '#/cuenta',
  admin: '#/admin',
  queens: '#/queens',
  sudoku: '#/sudoku',
  wordle: '#/wordle',
  mahjong: '#/mahjong',
  zip: '#/zip',
  memoria: '#/memoria',
}

let currentRoute: Route | null = null

function parseHash(): Route {
  const raw = window.location.hash.replace(/^#\/?/, '').trim()

  if (raw === '' || raw === 'inicio') return 'home'
  if (raw === 'ajustes' || raw === 'settings') return 'settings'
  if (raw === 'cuenta') return 'account'
  if (raw === 'admin') return 'admin'
  if (isPlayableGameId(raw)) return raw

  return 'home'
}

/**
 * Rutas protegidas:
 * - `#/admin`, solo admin.
 * - Un juego desactivado por el admin (interruptor global): los jugadores
 *   vuelven a inicio; el admin sí entra, para probarlo.
 *
 * Mientras la sesión se resuelve no se expulsa a nadie: se espera, porque al
 * recargar el perfil todavía no está cargado y sería una expulsión falsa.
 */
function guard(route: Route): Route {
  const { loading } = getSession()

  if (route === 'admin') {
    if (loading) return route
    return isAdmin() ? route : 'settings'
  }

  if (isPlayableGameId(route) && !isGameEnabled(route)) {
    if (loading || isAdmin()) return route
    return 'home'
  }

  return route
}

function show(route: Route): void {
  if (route === currentRoute) return

  if (currentRoute) SCREENS[currentRoute].unmount()

  currentRoute = route
  SCREENS[route].mount()
  window.scrollTo(0, 0)
}

function navigate(): void {
  const route = guard(parseHash())

  if (window.location.hash !== HASH_OF[route]) {
    window.history.replaceState(null, '', HASH_OF[route])
  }

  show(route)
}

window.addEventListener('hashchange', navigate)

// Al resolverse la sesión (o cambiar los juegos activos) se vuelve a evaluar
// la ruta: si alguien recargó en `#/admin` sin ser admin, o en un juego que el
// admin acaba de ocultar, aquí es donde sale.
onSessionChange(() => navigate())
onGameSettingsChange(() => navigate())

/**
 * Botón de tema del header (sol / luna). Se atiende aquí, a nivel documento,
 * porque vive en todas las pantallas y NO debe re-renderizar la pantalla
 * actual: la partida en curso sigue igual, solo cambian los colores.
 */
document.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>(
    '[data-action="toggle-theme"]'
  )
  if (!button) return

  setThemePreference(getResolvedTheme() === 'light' ? 'dark' : 'light')
  // Que un Enter posterior (Wordle) no vuelva a "pulsar" el botón.
  button.blur()
})

onThemeChange(() => {
  document.querySelectorAll<HTMLButtonElement>('[data-action="toggle-theme"]').forEach((button) => {
    const label = themeToggleLabel()
    button.innerHTML = renderThemeToggleContent()
    button.setAttribute('aria-label', label)
    button.title = label
  })
})

initTheme()
initRecords()
initOffline()
initUserMenu()
initGameSettings()
navigate()
void initSession()
