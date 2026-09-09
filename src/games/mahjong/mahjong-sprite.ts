/**
 * Carga el sprite de las fichas (public/art/mahjong/mahjong-tiles.svg) una
 * sola vez y lo deja escondido en el <body>, para que cada ficha del tablero
 * sea un <use href="#mj-..."> en vez de repetir el dibujo 144 veces.
 */

const CONTAINER_ID = 'mahjong-sprite'

let spritePromise: Promise<void> | null = null

export function loadMahjongSprite(): Promise<void> {
  if (spritePromise) return spritePromise

  if (document.getElementById(CONTAINER_ID)) {
    spritePromise = Promise.resolve()
    return spritePromise
  }

  spritePromise = fetch('/art/mahjong/mahjong-tiles.svg')
    .then((response) => {
      if (!response.ok) throw new Error(`No se pudieron cargar las fichas (${response.status})`)
      return response.text()
    })
    .then((markup) => {
      if (document.getElementById(CONTAINER_ID)) return

      const holder = document.createElement('div')
      holder.id = CONTAINER_ID
      holder.setAttribute('aria-hidden', 'true')
      holder.innerHTML = markup
      document.body.appendChild(holder)
    })
    .catch((error: unknown) => {
      spritePromise = null
      throw error
    })

  return spritePromise
}
