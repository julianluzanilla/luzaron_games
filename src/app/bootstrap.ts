import { setConnectionMode, setLevelUpdate } from './state'
import { checkConnection } from '../core/connection'
import { seedDefaultProfiles } from '../core/profiles-repository'
import { updateLevelCatalog } from '../core/level-updater'

export async function bootstrapApp(): Promise<void> {
  await seedDefaultProfiles()

  const connectionStatus = await checkConnection()

  if (!connectionStatus.isOnline) {
    setConnectionMode('offline')
    setLevelUpdate({
      mode: 'offline',
      message: 'Sin conexión. Usando contenido local.',
      completedPacks: 0,
      totalPacks: 0,
    })

    return
  }

  setConnectionMode('online')

  try {
    await updateLevelCatalog((progress) => {
      setLevelUpdate(progress)
    })
  } catch (error) {
    console.error('Level update failed:', error)

    setLevelUpdate({
      mode: 'error',
      message: 'No se pudieron actualizar los niveles.',
      completedPacks: 0,
      totalPacks: 0,
    })
  }
}
