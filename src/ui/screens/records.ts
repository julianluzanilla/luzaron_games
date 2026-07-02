export function renderRecordsScreen(): string {
  return `
    <section class="screen content-screen">
      <div class="section-header">
        <p class="eyebrow">Resultados</p>
        <h1>Records</h1>
        <p>
          Aquí se mostrarán los mejores tiempos por usuario, juego y puzzle.
        </p>
      </div>

      <div class="placeholder-panel">
        <h2>Sin records todavía</h2>
        <p>
          Los records locales se implementarán junto con los motores comunes de juego.
        </p>
      </div>
    </section>
  `
}
