import { getDb } from './db'
import type { SyncQueueItem } from './db-types'
import { createId } from './ids'

export async function enqueueSyncItem(
  type: SyncQueueItem['type'],
  payload: unknown
): Promise<string> {
  const db = await getDb()
  const now = new Date().toISOString()
  const syncItemId = createId('sync')

  const syncItem: SyncQueueItem = {
    id: syncItemId,
    type,
    payload,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  }

  await db.put('syncQueue', syncItem)

  return syncItemId
}

export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  const db = await getDb()
  return db.getAllFromIndex('syncQueue', 'by-status', 'pending')
}

export async function getSyncItemsByType(type: SyncQueueItem['type']): Promise<SyncQueueItem[]> {
  const db = await getDb()
  return db.getAllFromIndex('syncQueue', 'by-type', type)
}

export async function updateSyncItemStatus(
  syncItemId: string,
  status: SyncQueueItem['status']
): Promise<void> {
  const db = await getDb()
  const existingItem = await db.get('syncQueue', syncItemId)

  if (!existingItem) return

  await db.put('syncQueue', {
    ...existingItem,
    status,
    updatedAt: new Date().toISOString(),
  })
}

export async function removeSyncItem(syncItemId: string): Promise<void> {
  const db = await getDb()
  await db.delete('syncQueue', syncItemId)
}

export async function clearSyncingItems(): Promise<void> {
  const db = await getDb()
  const tx = db.transaction('syncQueue', 'readwrite')
  const index = tx.store.index('by-status')

  let cursor = await index.openCursor('syncing')

  while (cursor) {
    await cursor.delete()
    cursor = await cursor.continue()
  }

  await tx.done
}
