import './style.css'

import { isPlayableGameId, type GameId } from './shell/games'
import { initTheme } from './shell/theme'
import { initSession, isAdmin, getSession, onSessionChange } from './shell/session'
import { initRecords } from './shell/records'
import { mountHomeApp, unmountHomeApp } from './shell/home-app'
import { mountSettingsApp, unmountSettingsApp } from './shell/settings-app'
import { mountAdminApp, unmountAdminApp } from './shell/admin-app'
import { mountQueensApp, unmountQueensApp } from './queens-app'
import { mountSudokuApp, unmountSudokuApp } from './sudoku-app'
import { mountWordleApp, unmountWordleApp } from './wordle-app'
import { mountMahjongApp, unmountMahjongApp } from './mahjong-app'

/**
 * Router de la app.
 *
 * La raíz (`#/`) es la pantalla de inicio con las cuatro miniaturas; cada juego
 * y cada pantalla interna viven en su propia ruta de hash. El hash basta porque
 * Cloudflare Pages sirve un solo `index.html` y así no hace falta configurar
 * reescrituras del servidor.
 */

type Route = 'home' | 'settings' | 'admin' | GameId

interface Screen {
  mount: () => void
  unmount: () => void
}

const SCREENS: Record<Route, Screen> = {
  home: { mount: mountHomeApp, unmount: unmountHomeApp },
  settings: { mount: mountSettingsApp, unmount: unmountSettingsApp },
  admin: { mount: mountAdminApp, unmount: unmountAdminApp },
  queens: { mount: mountQueensApp, unmount: unmountQueensApp },
  sudoku: { mount: mountSudokuApp, unmount: unmountSudokuApp },
  wordle: { mount: mountWordleApp, unmount: unmountWordleApp },
  mahjong: { mount: mountMahjongApp, unmount: unmountMahjongApp },
}

/** Nombre de la ruta en la URL. Se traduce solo lo que el usuario puede leer. */
const HASH_OF: Record<Route, string> = {
  home: '#/',
  settings: '#/ajustes',
  admin: '#/admin',
  queens: '#/queens',
  sudoku: '#/sudoku',
  wordle: '#/wordle',
  mahjong: '#/mahjong',
}

let currentRoute: Route | null = null

function parseHash(): Route {
  const raw = window.location.hash.replace(/^#\/?/, '').trim()

  if (raw === '' || raw === 'inicio') return 'home'
  if (raw === 'ajustes' || raw === 'settings') return 'settings'
  if (raw === 'admin') return 'admin'
  if (isPlayableGameId(raw)) return raw

  return 'home'
}

/**
 * El panel de admin es la única ruta protegida. Mientras la sesión se resuelve
 * no se expulsa a nadie: se espera, porque al recargar en `#/admin` el perfil
 * todavía no está cargado y sería una expulsión falsa.
 */
function guard(route: Route): Route {
  if (route !== 'admin') return route

  const { loading } = getSession()

  if (loading) return route

  return isAdmin() ? route : 'settings'
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

// Al resolverse la sesión se vuelve a evaluar la ruta: si alguien recargó en
// `#/admin` sin ser admin, aquí es donde sale.
onSessionChange(() => {
  if (currentRoute === 'admin') navigate()
})

initTheme()
initRecords()
navigate()
void initSession()
