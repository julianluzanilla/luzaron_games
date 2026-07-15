import type { AppUser } from './types'

export const CURRENT_USER_STORAGE_KEY = 'luzaron-games-current-user'

export const guestUser: AppUser = {
  id: 'guest',
  name: 'Invitado',
  avatar: '👤',
  isGuest: true,
}

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

export function getUserById(userId: string | null): AppUser {
  if (!userId) return guestUser

  return localUsers.find((user) => user.id === userId) ?? guestUser
}
