import type { DownloadedPack } from './db-types'

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
