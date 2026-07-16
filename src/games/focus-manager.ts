export type AppFocusStatus = 'active' | 'inactive'

export function getCurrentFocusStatus(): AppFocusStatus {
  if (document.visibilityState !== 'visible') {
    return 'inactive'
  }

  if (!document.hasFocus()) {
    return 'inactive'
  }

  return 'active'
}

export function shouldPauseForFocusLoss(status: AppFocusStatus): boolean {
  return status === 'inactive'
}

export function shouldResumeAfterFocusReturn(status: AppFocusStatus): boolean {
  return status === 'active'
}
