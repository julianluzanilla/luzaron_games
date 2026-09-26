/**
 * Dibujo del tablero de Memoria.
 *
 * Cada carta es un <button> con dos <img> apiladas (reverso y cara) dentro de
 * un contenedor que gira con `rotateY`. Las imágenes son data URIs de SVG,
 * cacheadas por canto y color: el navegador rasteriza cada una una sola vez
 * en lugar de repetir cientos de nodos SVG (handoff, "Rendimiento").
 *
 * Los cantos salen del mismo sprite que usa Mahjong
 * (public/art/mahjong/mahjong-tiles.svg), sin el cuerpo de la ficha.
 */

import {
  CARD_MATCH,
  CARD_RED,
  MEMORIA_BACK_SVG,
  MEMORIA_CANTOS,
  memoriaFaceSvg,
  svgToDataUri,
} from './memoria-cards'
import type { MemoriaCanto, MemoriaGame } from './memoria-engine'

const SPRITE_URL = '/art/mahjong/mahjong-tiles.svg'

/** Nombre leíble de cada canto, para lectores de pantalla. */
const CANTO_NAMES: Record<MemoriaCanto, string> = {
  p1: 'uno de círculos',
  p3: 'tres de círculos',
  p5: 'cinco de círculos',
  p9: 'nueve de círculos',
  s1: 'uno de bambú',
  s3: 'tres de bambú',
  s5: 'cinco de bambú',
  s9: 'nueve de bambú',
  m1: 'uno de caracteres',
  m5: 'cinco de caracteres',
  m9: 'nueve de caracteres',
  we: 'viento del este',
  wn: 'viento del norte',
  dr: 'dragón rojo',
  dg: 'dragón verde',
  dw: 'dragón blanco',
  f1: 'flor',
  e1: 'estación',
}

let glyphs: Map<string, string> | null = null
let glyphsPromise: Promise<void> | null = null
const faceCache = new Map<string, string>()

export const MEMORIA_BACK_URI = svgToDataUri(MEMORIA_BACK_SVG)

/**
 * Descarga el sprite una vez y guarda el interior de cada <symbol> que usa
 * Memoria, quitando su `<use href="#mj-body"/>` (el cuerpo y relieve de la ficha).
 */
export function loadMemoriaGlyphs(): Promise<void> {
  if (glyphs) return Promise.resolve()
  if (glyphsPromise) return glyphsPromise

  glyphsPromise = fetch(SPRITE_URL)
    .then((response) => {
      if (!response.ok) throw new Error(`No se pudieron cargar los cantos (${response.status})`)
      return response.text()
    })
    .then((markup) => {
      const found = new Map<string, string>()
      const pattern = /<symbol id="mj-([a-z0-9]+)"[^>]*>([\s\S]*?)<\/symbol>/g

      for (const match of markup.matchAll(pattern)) {
        const [, id, body] = match
        if (!(MEMORIA_CANTOS as readonly string[]).includes(id)) continue
        found.set(id, body.replace(/<use\s+(?:xlink:)?href="#mj-body"\s*\/>/g, ''))
      }

      const missing = MEMORIA_CANTOS.filter((id) => !found.has(id))
      if (missing.length) throw new Error(`Faltan cantos en el sprite: ${missing.join(', ')}`)

      glyphs = found
    })
    .catch((error: unknown) => {
      glyphsPromise = null
      throw error
    })

  return glyphsPromise
}

/** Cara de un canto como data URI; `matched` pinta el marco en magenta. */
export function faceUri(canto: MemoriaCanto, matched: boolean): string {
  const color = matched ? CARD_MATCH : CARD_RED
  const key = `${canto}|${color}`
  const cached = faceCache.get(key)
  if (cached) return cached

  const uri = svgToDataUri(memoriaFaceSvg(glyphs?.get(canto) ?? '', color))
  faceCache.set(key, uri)
  return uri
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
  /** Final de partida: todas las caras con el marco rojo. */
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

  const name = CANTO_NAMES[game.cards[index].canto]
  return view.matched ? `${position}, ${name}, par encontrado` : `${position}, ${name}`
}

export function renderMemoriaCard(game: MemoriaGame, index: number, view: CardView): string {
  const canto = game.cards[index].canto
  const locked = view.matched || view.revealed

  return `
    <button type="button" class="${cardClasses(view)}" data-card="${index}"
            aria-label="${cardLabel(game, index, view)}" ${locked ? 'aria-disabled="true"' : ''}>
      <span class="memoria-card-inner">
        <img class="memoria-card-back" src="${MEMORIA_BACK_URI}" alt="" draggable="false" />
        <img class="memoria-card-front" src="${faceUri(canto, view.matched)}" alt="" draggable="false" />
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

  const front = element.querySelector<HTMLImageElement>('.memoria-card-front')
  const src = faceUri(game.cards[index].canto, view.matched)
  if (front && front.getAttribute('src') !== src) front.setAttribute('src', src)
}
