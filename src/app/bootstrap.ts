import { setConnectionMode } from './state'
import { checkConnection } from '../core/connection'
import { seedDefaultProfiles } from '../core/profiles-repository'

export async function bootstrapApp(): Promise<void> {
  await seedDefaultProfiles()

  const connectionStatus = await checkConnection()

  setConnectionMode(connectionStatus.isOnline ? 'online' : 'offline')
}
