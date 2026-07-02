import './style.css'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main class="app-shell">
    <section class="hero-card">
      <div class="brand-badge">👑</div>

      <h1>Luzaron Games</h1>
      <p class="subtitle">
        Juegos mentales familiares, sin anuncios y disponibles offline.
      </p>

      <div class="game-grid">
        <button class="game-card" type="button">
          <span class="game-icon">🟩</span>
          <span class="game-title">Wordle</span>
          <span class="game-description">Adivina la palabra.</span>
        </button>

        <button class="game-card" type="button">
          <span class="game-icon">🔢</span>
          <span class="game-title">Sudoku</span>
          <span class="game-description">Mini 6x6 y regular 9x9.</span>
        </button>

        <button class="game-card" type="button">
          <span class="game-icon">👑</span>
          <span class="game-title">Queens</span>
          <span class="game-description">Coloca una reina por fila, columna y región.</span>
        </button>
      </div>

      <nav class="bottom-nav" aria-label="Navegación principal">
        <button type="button">Usuarios</button>
        <button type="button">Biblioteca</button>
        <button type="button">Records</button>
        <button type="button">Ajustes</button>
      </nav>
    </section>
  </main>
`

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch((error) => {
      console.error('Service Worker registration failed:', error)
    })
  })
}
