import type { DownloadedPack } from './db-types'
import { getAllPacks, savePack } from './packs-repository'

const demoPacks: DownloadedPack[] = [
  {
    id: 'queens-7x7-demo',
    gameId: 'queens',
    title: 'Queens 7x7 Demo',
    version: 1,
    status: 'available',
    levelCount: 0,
    fileUrl: '/levels/queens/queens-7x7-demo.json',
    updatedAt: '2026-07-15T00:00:00.000Z',
  },
  {
    id: 'queens-8x8-demo',
    gameId: 'queens',
    title: 'Queens 8x8 Demo',
    version: 1,
    status: 'available',
    levelCount: 0,
    fileUrl: '/levels/queens/queens-8x8-demo.json',
    updatedAt: '2026-07-15T00:00:00.000Z',
  },
  {
    id: 'sudoku-mini-6x6-demo',
    gameId: 'sudoku',
    title: 'Sudoku Mini 6x6 Demo',
    version: 1,
    status: 'available',
    levelCount: 0,
    fileUrl: '/levels/sudoku/sudoku-mini-6x6-demo.json',
    updatedAt: '2026-07-15T00:00:00.000Z',
  },
  {
    id: 'sudoku-regular-9x9-demo',
    gameId: 'sudoku',
    title: 'Sudoku Regular 9x9 Demo',
    version: 1,
    status: 'available',
    levelCount: 0,
    fileUrl: '/levels/sudoku/sudoku-regular-9x9-demo.json',
    updatedAt: '2026-07-15T00:00:00.000Z',
  },
  {
    id: 'wordle-es-5-demo',
    gameId: 'wordle',
    title: 'Wordle Español 5 Letras Demo',
    version: 1,
    status: 'available',
    levelCount: 0,
    fileUrl: '/levels/wordle/wordle-es-5-demo.json',
    updatedAt: '2026-07-15T00:00:00.000Z',
  },
  {
    id: 'wordle-en-5-demo',
    gameId: 'wordle',
    title: 'Wordle Inglés 5 Letras Demo',
    version: 1,
    status: 'available',
    levelCount: 0,
    fileUrl: '/levels/wordle/wordle-en-5-demo.json',
    updatedAt: '2026-07-15T00:00:00.000Z',
  },
]

export async function seedDemoPacks(): Promise<void> {
  const existingPacks = await getAllPacks()

  if (existingPacks.length > 0) return

  await Promise.all(demoPacks.map((pack) => savePack(pack)))
}
