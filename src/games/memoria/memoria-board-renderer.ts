/**
 * Dibujo del tablero de Memoria.
 *
 * Cada carta es un <button> con dos caras apiladas dentro de un contenedor que
 * gira con `rotateY`:
 * - Reverso: una sola <img> con el SVG del reverso como data URI, compartida por
 *   todas las cartas (el navegador la rasteriza una vez).
 * - Cara: sticker de jugador en HTML — marco crema, foto recortada y franja con
 *   el nombre en la tipografía de la app. La franja cambia de color por CSS
 *   (rojo normal, magenta al encontrar el par).
 */

import { MEMORIA_BACK_SVG, svgToDataUri } from './memoria-cards'
import type { MemoriaGame } from './memoria-engine'
import { getMemoriaPlayer, playerPhotoUrl } from './memoria-players'

export const MEMORIA_BACK_URI = svgToDataUri(MEMORIA_BACK_SVG)

const loaded = new Map<string, Promise<void>>()

/**
 * Descarga y decodifica las fotos de una partida antes de mostrar el tablero,
 * para que ninguna cara aparezca en blanco a media animación. Una foto que
 * falla no detiene el juego: la carta queda con el nombre.
 */
export function preloadPlayerPhotos(ids: string[]): Promise<void> {
  const pending = [...new Set(ids)].map((id) => {
    let promise = loaded.get(id)
    if (!promise) {
      const image = new Image()
      image.src = playerPhotoUrl(id)
      promise = image.decode().catch(() => undefined)
      loaded.set(id, promise)
    }
    return promise
  })
  return Promise.all(pending).then(() => undefined)
}

/** La carta más grande que cabe en W×H con proporción 3:4 y separación `gap`. */
export function cardSize(cols: number, rows: number, W: number, H: number, gap = 6) {
  let w = (W - gap * (cols - 1)) / cols
  let h = (w * 4) / 3
  if (h * rows + gap * (rows - 1) > H) {
    h = (H - gap * (rows - 1)) / rows
    w = h * 0.75
  }
  return { w: Math.max(0, Math.floor(w)), h: Math.max(0, Math.floor(h)) }
}

export interface CardView {
  /** Boca arriba (volteada, par encontrado o final de partida). */
  up: boolean
  /** Volteada y pendiente de resolver. */
  open: boolean
  /** Parte de un par fallido: borde rojo hasta que vuelve boca abajo. */
  wrong: boolean
  matched: boolean
  /** Final de partida: todas las caras con la franja roja. */
  revealed: boolean
}

export function cardView(
  game: MemoriaGame,
  index: number,
  wrong: readonly number[],
  revealed: boolean
): CardView {
  const card = game.cards[index]
  const open = game.open.includes(index)

  return {
    up: revealed || card.matched || open,
    open: open && !revealed,
    wrong: wrong.includes(index) && !revealed,
    matched: card.matched && !revealed,
    revealed,
  }
}

function cardClasses(view: CardView): string {
  return [
    'memoria-card',
    view.up ? 'is-up' : '',
    view.open ? 'is-open' : '',
    view.wrong ? 'is-wrong' : '',
    view.matched ? 'is-matched' : '',
    view.revealed ? 'is-revealed' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function cardLabel(game: MemoriaGame, index: number, view: CardView): string {
  const position = `Carta ${index + 1}`
  if (!view.up) return `${position}, boca abajo`

  const name = getMemoriaPlayer(game.cards[index].player).fullName
  return view.matched ? `${position}, ${name}, par encontrado` : `${position}, ${name}`
}

export function renderMemoriaCard(game: MemoriaGame, index: number, view: CardView): string {
  const player = getMemoriaPlayer(game.cards[index].player)
  const locked = view.matched || view.revealed

  return `
    <button type="button" class="${cardClasses(view)}" data-card="${index}"
            aria-label="${cardLabel(game, index, view)}" ${locked ? 'aria-disabled="true"' : ''}>
      <span class="memoria-card-inner">
        <img class="memoria-card-back" src="${MEMORIA_BACK_URI}" alt="" draggable="false" />
        <span class="memoria-card-front" aria-hidden="true">
          <span class="memoria-sticker-photo">
            <img src="${playerPhotoUrl(player.id)}" alt="" draggable="false" decoding="async" />
          </span>
          <span class="memoria-sticker-name">${player.name}</span>
        </span>
      </span>
    </button>
  `
}

/**
 * Actualiza una carta ya pintada sin reemplazar el nodo: así la transición
 * de `transform` corre y se ve el volteo.
 */
export function updateMemoriaCard(
  element: HTMLElement,
  game: MemoriaGame,
  index: number,
  view: CardView
): void {
  element.className = cardClasses(view)
  element.setAttribute('aria-label', cardLabel(game, index, view))

  if (view.matched || view.revealed) element.setAttribute('aria-disabled', 'true')
  else element.removeAttribute('aria-disabled')
}
