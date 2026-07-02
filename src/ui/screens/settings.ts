export function renderSettingsScreen(): string {
  return `
    <section class="screen content-screen">
      <div class="section-header">
        <p class="eyebrow">Preferencias</p>
        <h1>Ajustes</h1>
        <p>
          Aquí se configurará tema claro/oscuro, sonido, vibración y otras preferencias.
        </p>
      </div>

      <div class="placeholder-panel">
        <h2>Configuración pendiente</h2>
        <p>
          Las preferencias locales se implementarán en el capítulo de experiencia de usuario.
        </p>
      </div>
    </section>
  `
}
