import type { AppUser } from './types'
import { guestUser } from './state'

export const localUsers: AppUser[] = [
  guestUser,
  {
    id: 'julian',
    name: 'Julián',
    avatar: '🦊',
    isGuest: false,
  },
  {
    id: 'ana',
    name: 'Ana',
    avatar: '🐼',
    isGuest: false,
  },
  {
    id: 'user-3',
    name: 'Jugador 3',
    avatar: '🐯',
    isGuest: false,
  },
  {
    id: 'user-4',
    name: 'Jugador 4',
    avatar: '🐸',
    isGuest: false,
  },
]
