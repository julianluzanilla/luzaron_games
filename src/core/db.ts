import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type {
  DownloadedPack,
  GameProgress,
  LocalLevel,
  LocalProfile,
  LocalRecord,
  LocalSession,
  SyncQueueItem,
} from './db-types'

interface LuzaronGamesDB extends DBSchema {
  profiles: {
    key: string
    value: LocalProfile
    indexes: {
      'by-name': string
    }
  }

  sessions: {
    key: string
    value: LocalSession
  }

  packs: {
    key: string
    value: DownloadedPack
    indexes: {
      'by-game': string
      'by-status': string
    }
  }

  levels: {
    key: string
    value: LocalLevel
    indexes: {
      'by-pack': string
      'by-game': string
    }
  }

  progress: {
    key: string
    value: GameProgress
    indexes: {
      'by-user': string
      'by-level': string
      'by-status': string
    }
  }

  records: {
    key: string
    value: LocalRecord
    indexes: {
      'by-user': string
      'by-level': string
      'by-game': string
    }
  }

  syncQueue: {
    key: string
    value: SyncQueueItem
    indexes: {
      'by-status': string
      'by-type': string
    }
  }
}

const DB_NAME = 'luzaron-games'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<LuzaronGamesDB>> | null = null

export function getDb(): Promise<IDBPDatabase<LuzaronGamesDB>> {
  if (!dbPromise) {
    dbPromise = openDB<LuzaronGamesDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('profiles')) {
          const profilesStore = db.createObjectStore('profiles', { keyPath: 'id' })
          profilesStore.createIndex('by-name', 'name')
        }

        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'id' })
        }

        if (!db.objectStoreNames.contains('packs')) {
          const packsStore = db.createObjectStore('packs', { keyPath: 'id' })
          packsStore.createIndex('by-game', 'gameId')
          packsStore.createIndex('by-status', 'status')
        }

        if (!db.objectStoreNames.contains('levels')) {
          const levelsStore = db.createObjectStore('levels', { keyPath: 'id' })
          levelsStore.createIndex('by-pack', 'packId')
          levelsStore.createIndex('by-game', 'gameId')
        }

        if (!db.objectStoreNames.contains('progress')) {
          const progressStore = db.createObjectStore('progress', { keyPath: 'id' })
          progressStore.createIndex('by-user', 'userId')
          progressStore.createIndex('by-level', 'levelId')
          progressStore.createIndex('by-status', 'status')
        }

        if (!db.objectStoreNames.contains('records')) {
          const recordsStore = db.createObjectStore('records', { keyPath: 'id' })
          recordsStore.createIndex('by-user', 'userId')
          recordsStore.createIndex('by-level', 'levelId')
          recordsStore.createIndex('by-game', 'gameId')
        }

        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncQueueStore = db.createObjectStore('syncQueue', { keyPath: 'id' })
          syncQueueStore.createIndex('by-status', 'status')
          syncQueueStore.createIndex('by-type', 'type')
        }
      },
    })
  }

  return dbPromise
}
