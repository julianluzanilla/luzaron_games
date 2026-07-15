import { setConnectionMode, setCurrentUser, setLevelUpdate } from './state'
import { checkConnection } from '../core/connection'
import { seedDefaultProfiles } from '../core/profiles-repository'
import { updateLevelCatalog } from '../core/level-updater'
import { getCurrentSession } from '../core/session-repository'
import { getUserById } from './users'

export async function bootstrapApp(): Promise<void> {
  await seedDefaultProfiles()
  await restoreLocalSession()

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

async function restoreLocalSession(): Promise<void> {
  const session = await getCurrentSession()

  if (!session) return

  setCurrentUser(getUserById(session.currentUserId))
}
