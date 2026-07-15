import type { DownloadedPack, PackDifficulty } from './db-types'

export function getPackStatusLabel(status: DownloadedPack['status']): string {
  switch (status) {
    case 'available':
      return 'Disponible'

    case 'downloading':
      return 'Descargando'

    case 'downloaded':
      return 'Descargado'

    case 'update-available':
      return 'Actualización disponible'

    case 'error':
      return 'Error'

    default:
      return 'Desconocido'
  }
}

export function getPackStatusClass(status: DownloadedPack['status']): string {
  return `pack-status-${status}`
}

export function getPackDifficultyLabel(difficulty: PackDifficulty): string {
  switch (difficulty) {
    case 'easy':
      return 'Fácil'

    case 'medium':
      return 'Medio'

    case 'hard':
      return 'Difícil'

    case 'mixed':
      return 'Mixto'

    default:
      return 'Mixto'
  }
}
