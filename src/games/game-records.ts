import type { GameId } from '../app/types'
import type { LocalRecord } from '../core/db-types'
import { getRecordsByUser, getTopCleanRecordsByLevel, saveRecord } from '../core/records-repository'
import { enqueueSyncItem } from '../core/sync-queue-repository'

export const DEFAULT_HINT_PENALTY_MS = 30_000

export interface SaveGameRecordInput {
  userId: string
  gameId: GameId
  packId: string
  levelId: string
  rawTimeMs: number
  hintsUsed?: number
  hintPenaltyMs?: number
  completedAt?: string
  queueForSync?: boolean
}

export function calculateHintPenaltyMs(
  hintsUsed: number,
  penaltyPerHintMs = DEFAULT_HINT_PENALTY_MS
): number {
  return Math.max(0, hintsUsed) * penaltyPerHintMs
}

export function calculateFinalTimeMs(
  rawTimeMs: number,
  hintsUsed: number,
  penaltyPerHintMs = DEFAULT_HINT_PENALTY_MS
): number {
  return Math.max(0, rawTimeMs) + calculateHintPenaltyMs(hintsUsed, penaltyPerHintMs)
}

export function isCleanRecord(hintsUsed: number): boolean {
  return hintsUsed === 0
}

export async function saveGameRecord(input: SaveGameRecordInput): Promise<string> {
  const hintsUsed = input.hintsUsed ?? 0
  const hintPenaltyMs = input.hintPenaltyMs ?? calculateHintPenaltyMs(hintsUsed)
  const finalTimeMs = Math.max(0, input.rawTimeMs) + hintPenaltyMs

  const record: Omit<LocalRecord, 'id'> = {
    userId: input.userId,
    gameId: input.gameId,
    packId: input.packId,
    levelId: input.levelId,
    rawTimeMs: Math.max(0, input.rawTimeMs),
    finalTimeMs,
    hintsUsed,
    hintPenaltyMs,
    isCleanRecord: isCleanRecord(hintsUsed),
    completedAt: input.completedAt ?? new Date().toISOString(),
  }

  const recordId = await saveRecord(record)

  if (input.queueForSync !== false && input.userId !== 'guest') {
    await enqueueSyncItem('record', {
      ...record,
      id: recordId,
    })
  }

  return recordId
}

export async function getTopCleanGameRecords(levelId: string, limit = 3): Promise<LocalRecord[]> {
  return getTopCleanRecordsByLevel(levelId, limit)
}

export async function getUserGameRecords(userId: string): Promise<LocalRecord[]> {
  return getRecordsByUser(userId)
}
