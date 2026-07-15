import type { AppUser } from '../app/types'
import { localUsers } from '../app/users'
import { getDb } from './db'
import type { LocalProfile } from './db-types'

export async function seedDefaultProfiles(): Promise<void> {
  const db = await getDb()
  const existingProfiles = await db.getAll('profiles')

  if (existingProfiles.length > 0) return

  const now = new Date().toISOString()

  const profiles: LocalProfile[] = localUsers.map((user) => ({
    ...user,
    createdAt: now,
    updatedAt: now,
  }))

  const tx = db.transaction('profiles', 'readwrite')

  await Promise.all(profiles.map((profile) => tx.store.put(profile)))

  await tx.done
}

export async function getLocalProfiles(): Promise<AppUser[]> {
  const db = await getDb()
  const profiles = await db.getAll('profiles')

  return profiles.map((profile) => ({
    id: profile.id,
    name: profile.name,
    avatar: profile.avatar,
    isGuest: profile.isGuest,
  }))
}
