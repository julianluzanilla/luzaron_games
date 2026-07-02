import type { GameId } from '../../app/types'

const gameContent: Record<
  GameId,
  {
    icon: string
    title: string
    description: string
    details: string
  }
> = {
  queens: {
    icon: '👑',
    title: 'Queens',
    description: 'Coloca una reina por fila, columna y región.',
    details:
      'Este será el primer juego completo. Tendrá tableros 7x7 a 12x12, timer, hints, reset, deshacer y records.',
  },
  sudoku: {
    icon: '🔢',
    title: 'Sudoku',
    description: 'Mini 6x6 y regular 9x9.',
    details:
      'Sudoku se implementará después de Queens, con teclado físico, selector inferior de números, notas y records.',
  },
  wordle: {
    icon: '🟩',
    title: 'Wordle',
    description: 'Adivina la palabra.',
    details:
      'Wordle tendrá diccionarios en español e inglés, teclado virtual, teclado físico y normalización de Ñ como N.',
  },
}

export function renderGamePlaceholder(gameId: GameId): string {
  const game = gameContent[gameId]

  return `
    <section class="screen content-screen">
      <div class="game-placeholder">
        <div class="game-placeholder-icon">${game.icon}</div>

        <div class="section-header">
          <p class="eyebrow">Juego</p>
          <h1>${game.title}</h1>
          <p>${game.description}</p>
        </div>

        <div class="placeholder-panel">
          <h2>Próximamente</h2>
          <p>${game.details}</p>

          <div class="button-row">
            <button type="button" class="primary-button" data-route="library">
              Ver biblioteca
            </button>

            <button type="button" class="secondary-button" data-route="home">
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    </section>
  `
}
