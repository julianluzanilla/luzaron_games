import type { AppState } from '../../app/types'
import { localUsers } from '../../app/users'

export function renderUsersScreen(state: AppState): string {
  const usersHtml = localUsers
    .map((user) => {
      const isActive = user.id === state.currentUser.id

      return `
        <button
          class="profile-card ${isActive ? 'active' : ''}"
          type="button"
          data-user-id="${user.id}"
        >
          <span class="profile-avatar">${user.avatar}</span>
          <span class="profile-name">${user.name}</span>
          <span class="profile-status">${user.isGuest ? 'Sin records remotos' : 'Jugador'}</span>
        </button>
      `
    })
    .join('')

  return `
    <section class="screen content-screen">
      <div class="section-header">
        <p class="eyebrow">Perfiles</p>
        <h1>Usuarios</h1>
        <p>
          Selecciona quién está jugando. Por ahora los perfiles son locales y
          provisionales.
        </p>
      </div>

      <div class="profile-grid">
        ${usersHtml}
      </div>
    </section>
  `
}
