export function renderUsersScreen(): string {
  return `
    <section class="screen content-screen">
      <div class="section-header">
        <p class="eyebrow">Perfiles</p>
        <h1>Usuarios</h1>
        <p>
          Aquí se seleccionará el usuario activo. Por ahora la app funciona como
          Invitado.
        </p>
      </div>

      <div class="placeholder-panel">
        <h2>Invitado activo</h2>
        <p>
          El modo Invitado permitirá jugar sin guardar records remotos.
          Los usuarios reales se implementarán en el capítulo de configuración
          y backend.
        </p>
      </div>
    </section>
  `
}
