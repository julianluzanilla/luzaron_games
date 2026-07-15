import type { AppState } from '../app/types'
import { getDb } from './db'
import type { LocalSession } from './db-types'

export const CURRENT_SESSION_ID = 'current'

export async function saveCurrentSessionFromState(state: AppState): Promise<void> {
  const db = await getDb()

  const session: LocalSession = {
    id: CURRENT_SESSION_ID,
    currentUserId: state.currentUser.id,
    route: state.route,
    updatedAt: new Date().toISOString(),
  }

  await db.put('sessions', session)
}

export async function getCurrentSession(): Promise<LocalSession | undefined> {
  const db = await getDb()

  return db.get('sessions', CURRENT_SESSION_ID)
}

export async function clearCurrentSession(): Promise<void> {
  const db = await getDb()

  await db.delete('sessions', CURRENT_SESSION_ID)
}
