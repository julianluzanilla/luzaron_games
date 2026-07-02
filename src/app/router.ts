import type { Route } from './types'

const validRoutes: Route[] = [
  'home',
  'users',
  'library',
  'records',
  'settings',
  'queens',
  'sudoku',
  'wordle',
]

export function getRouteFromHash(): Route {
  const rawRoute = window.location.hash.replace('#/', '') || 'home'

  if (validRoutes.includes(rawRoute as Route)) {
    return rawRoute as Route
  }

  return 'home'
}

export function navigateTo(route: Route): void {
  window.location.hash = route === 'home' ? '#/' : `#/${route}`
}

export function startRouter(onRouteChange: (route: Route) => void): void {
  window.addEventListener('hashchange', () => {
    onRouteChange(getRouteFromHash())
  })

  onRouteChange(getRouteFromHash())
}
