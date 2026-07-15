export interface ConnectionStatus {
  isOnline: boolean
  checkedAt: string
}

export async function checkConnection(): Promise<ConnectionStatus> {
  const checkedAt = new Date().toISOString()

  if (!navigator.onLine) {
    return {
      isOnline: false,
      checkedAt,
    }
  }

  try {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 3000)

    await fetch(`/manifest.webmanifest?connection-check=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    })

    window.clearTimeout(timeoutId)

    return {
      isOnline: true,
      checkedAt,
    }
  } catch {
    return {
      isOnline: false,
      checkedAt,
    }
  }
}
