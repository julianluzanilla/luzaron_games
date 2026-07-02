import type { AppState, Route } from './types'

let state: AppState = {
  route: 'home',
  currentUserName: 'Invitado',
  isGuest: true,
}

type Listener = (state: AppState) => void

const listeners = new Set<Listener>()

export function getState(): AppState {
  return state
}

export function setRoute(route: Route): void {
  state = {
    ...state,
    route,
  }

  notify()
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

function notify(): void {
  listeners.forEach((listener) => listener(state))
}
