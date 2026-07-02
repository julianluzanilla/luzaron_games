export function renderHomeScreen(): string {
  return `
    <section class="screen home-screen">
      <div class="hero-card">
        <div class="brand-badge">👑</div>

        <h1>Luzaron Games</h1>

        <p class="subtitle">
          Juegos mentales familiares, sin anuncios y disponibles offline.
        </p>

        <div class="game-grid">
          <button class="game-card" type="button" data-route="wordle">
            <span class="game-icon">🟩</span>
            <span class="game-title">Wordle</span>
            <span class="game-description">Adivina la palabra.</span>
          </button>

          <button class="game-card" type="button" data-route="sudoku">
            <span class="game-icon">🔢</span>
            <span class="game-title">Sudoku</span>
            <span class="game-description">Mini 6x6 y regular 9x9.</span>
          </button>

          <button class="game-card" type="button" data-route="queens">
            <span class="game-icon">👑</span>
            <span class="game-title">Queens</span>
            <span class="game-description">
              Coloca una reina por fila, columna y región.
            </span>
          </button>
        </div>
      </div>
    </section>
  `
}
