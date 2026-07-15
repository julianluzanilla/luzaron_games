import type { DownloadedPack } from './db-types'
import { getPackById, savePack } from './packs-repository'

const demoPacks: DownloadedPack[] = [
  {
    id: 'queens-7x7-demo',
    gameId: 'queens',
    title: 'Queens 7x7 Demo',
    category: '7x7',
    difficulty: 'mixed',
    sortOrder: 10,
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
    category: '8x8',
    difficulty: 'mixed',
    sortOrder: 20,
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
    category: 'Mini 6x6',
    difficulty: 'easy',
    sortOrder: 110,
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
    category: 'Regular 9x9',
    difficulty: 'medium',
    sortOrder: 120,
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
    category: 'Español',
    difficulty: 'mixed',
    sortOrder: 210,
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
    category: 'Inglés',
    difficulty: 'mixed',
    sortOrder: 220,
    version: 1,
    status: 'available',
    levelCount: 0,
    fileUrl: '/levels/wordle/wordle-en-5-demo.json',
    updatedAt: '2026-07-15T00:00:00.000Z',
  },
]

export async function seedDemoPacks(): Promise<void> {
  for (const demoPack of demoPacks) {
    const existingPack = await getPackById(demoPack.id)

    if (!existingPack) {
      await savePack(demoPack)
      continue
    }

    await savePack({
      ...demoPack,
      ...existingPack,
      category: existingPack.category ?? demoPack.category,
      difficulty: existingPack.difficulty ?? demoPack.difficulty,
      sortOrder: existingPack.sortOrder ?? demoPack.sortOrder,
    })
  }
}
