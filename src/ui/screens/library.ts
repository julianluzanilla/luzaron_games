export function renderLibraryScreen(): string {
  return `
    <section class="screen content-screen">
      <div class="section-header">
        <p class="eyebrow">Niveles</p>
        <h1>Biblioteca</h1>
        <p>
          Aquí aparecerán los packs descargables de Queens, Sudoku y Wordle.
        </p>
      </div>

      <div class="placeholder-grid">
        <article class="placeholder-panel">
          <h2>Queens</h2>
          <p>7x7, 8x8, 9x9, 10x10, 11x11 y 12x12.</p>
        </article>

        <article class="placeholder-panel">
          <h2>Sudoku</h2>
          <p>Mini 6x6 y regular 9x9.</p>
        </article>

        <article class="placeholder-panel">
          <h2>Wordle</h2>
          <p>Español e inglés, inicialmente de 5 letras.</p>
        </article>
      </div>
    </section>
  `
}
