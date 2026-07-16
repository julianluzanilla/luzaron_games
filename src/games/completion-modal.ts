import { formatElapsedTime } from './game-timer'

export interface PuzzleCompletionModalInput {
  title?: string
  puzzleNumber: number
  rawTimeMs: number
  finalTimeMs?: number
  hintsUsed: number
  canGoNext: boolean
  nextLabel?: string
  closeLabel?: string
}

export function renderPuzzleCompletionModal(input: PuzzleCompletionModalInput): string {
  const title = input.title ?? 'Puzzle completado'
  const finalTimeMs = input.finalTimeMs ?? input.rawTimeMs
  const hasPenalty = finalTimeMs > input.rawTimeMs

  return `
    <div class="completion-modal-backdrop" role="dialog" aria-modal="true">
      <section class="completion-modal">
        <p class="eyebrow">Completado</p>
        <h2>${title}</h2>

        <div class="completion-stats">
          <div class="completion-stat">
            <span>Puzzle</span>
            <strong>#${input.puzzleNumber}</strong>
          </div>

          <div class="completion-stat">
            <span>Tiempo</span>
            <strong>${formatElapsedTime(input.rawTimeMs)}</strong>
          </div>

          <div class="completion-stat">
            <span>Pistas utilizadas</span>
            <strong>${input.hintsUsed}</strong>
          </div>

          ${
            hasPenalty
              ? `
                <div class="completion-stat">
                  <span>Tiempo final</span>
                  <strong>${formatElapsedTime(finalTimeMs)}</strong>
                </div>
              `
              : ''
          }
        </div>

        <div class="completion-actions">
          <button
            type="button"
            class="secondary-button"
            data-action="close-completion-modal"
          >
            ${input.closeLabel ?? 'Cerrar'}
          </button>

          ${renderNextPuzzleButton(input)}
        </div>
      </section>
    </div>
  `
}

function renderNextPuzzleButton(input: PuzzleCompletionModalInput): string {
  if (!input.canGoNext) {
    return `
      <button type="button" class="primary-button" disabled>
        Último puzzle
      </button>
    `
  }

  return `
    <button
      type="button"
      class="primary-button"
      data-action="next-puzzle"
    >
      ${input.nextLabel ?? 'Siguiente Puzzle'}
    </button>
  `
}
