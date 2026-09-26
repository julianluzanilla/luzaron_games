/**
 * Memoria — cartas (rediseño Modernist). Todo en viewBox 100×133 (3:4).
 * Las caras reutilizan los cantos de public/art/mahjong/mahjong-tiles.svg
 * SIN el cuerpo de la ficha: se dibuja solo el contenido de cada <symbol>
 * quitando su <use href="#mj-body"/>.
 */

export const MEMORIA_CANTOS = [
  'p1',
  'p3',
  'p5',
  'p9',
  's1',
  's3',
  's5',
  's9',
  'm1',
  'm5',
  'm9',
  'we',
  'wn',
  'dr',
  'dg',
  'dw',
  'f1',
  'e1',
] as const

export const CARD_CREAM = '#fbf8f1'
export const CARD_RED = '#ec3013'
export const CARD_MATCH = '#e24aa0'

/** Reverso: una sola cadena, idéntica para todas las cartas. Úsala como <img src> o background-image (se rasteriza una vez). */
export const MEMORIA_BACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 133"><rect width="100" height="133" fill="#fbf8f1"/><rect x="5" y="5" width="90" height="123" fill="#ec3013"/><svg x="5" y="5" width="90" height="123" viewBox="5 5 90 123" overflow="hidden"><path d="M-140 0L-7 133M-140 133L-7 0M-134 0L-1 133M-134 133L-1 0M-128 0L5 133M-128 133L5 0M-122 0L11 133M-122 133L11 0M-116 0L17 133M-116 133L17 0M-110 0L23 133M-110 133L23 0M-104 0L29 133M-104 133L29 0M-98 0L35 133M-98 133L35 0M-92 0L41 133M-92 133L41 0M-86 0L47 133M-86 133L47 0M-80 0L53 133M-80 133L53 0M-74 0L59 133M-74 133L59 0M-68 0L65 133M-68 133L65 0M-62 0L71 133M-62 133L71 0M-56 0L77 133M-56 133L77 0M-50 0L83 133M-50 133L83 0M-44 0L89 133M-44 133L89 0M-38 0L95 133M-38 133L95 0M-32 0L101 133M-32 133L101 0M-26 0L107 133M-26 133L107 0M-20 0L113 133M-20 133L113 0M-14 0L119 133M-14 133L119 0M-8 0L125 133M-8 133L125 0M-2 0L131 133M-2 133L131 0M4 0L137 133M4 133L137 0M10 0L143 133M10 133L143 0M16 0L149 133M16 133L149 0M22 0L155 133M22 133L155 0M28 0L161 133M28 133L161 0M34 0L167 133M34 133L167 0M40 0L173 133M40 133L173 0M46 0L179 133M46 133L179 0M52 0L185 133M52 133L185 0M58 0L191 133M58 133L191 0M64 0L197 133M64 133L197 0M70 0L203 133M70 133L203 0M76 0L209 133M76 133L209 0M82 0L215 133M82 133L215 0M88 0L221 133M88 133L221 0M94 0L227 133M94 133L227 0M100 0L233 133M100 133L233 0M106 0L239 133M106 133L239 0M112 0L245 133M112 133L245 0M118 0L251 133M118 133L251 0M124 0L257 133M124 133L257 0M130 0L263 133M130 133L263 0M136 0L269 133M136 133L269 0M142 0L275 133M142 133L275 0M148 0L281 133M148 133L281 0M154 0L287 133M154 133L287 0M160 0L293 133M160 133L293 0M166 0L299 133M166 133L299 0M172 0L305 133M172 133L305 0M178 0L311 133M178 133L311 0M184 0L317 133M184 133L317 0M190 0L323 133M190 133L323 0M196 0L329 133M196 133L329 0M202 0L335 133M202 133L335 0M208 0L341 133M208 133L341 0M214 0L347 133M214 133L347 0M220 0L353 133M220 133L353 0M226 0L359 133M226 133L359 0M232 0L365 133M232 133L365 0M238 0L371 133M238 133L371 0" stroke="#fbf8f1" stroke-width=".45" stroke-opacity=".7" fill="none"/></svg><rect x="8" y="8" width="84" height="117" fill="none" stroke="#fbf8f1" stroke-width=".8"/><path d="M14 10L18 14L14 18L10 14Z" fill="#fbf8f1"/><path d="M86 10L90 14L86 18L82 14Z" fill="#fbf8f1"/><path d="M14 115L18 119L14 123L10 119Z" fill="#fbf8f1"/><path d="M86 115L90 119L86 123L82 119Z" fill="#fbf8f1"/><rect x="25" y="41.5" width="50" height="50" fill="#ec3013"/><rect x="27" y="43.5" width="46" height="46" fill="#fbf8f1"/><rect x="29.5" y="46" width="41" height="41" fill="none" stroke="#ec3013" stroke-width=".6"/><path d="M50 37.5L54 41.5L50 45.5L46 41.5Z" fill="#fbf8f1"/><path d="M50 87.5L54 91.5L50 95.5L46 91.5Z" fill="#fbf8f1"/><g transform="translate(35 51.5)"><rect x="0.8053691275167785" y="0.8053691275167785" width="8.456375838926174" height="8.456375838926174" fill="#9a55e0"/><rect x="0.8053691275167785" y="10.671140939597315" width="8.456375838926174" height="8.456375838926174" fill="#2f78e4"/><rect x="0.8053691275167785" y="20.53691275167785" width="8.456375838926174" height="8.456375838926174" fill="#1f9e52"/><rect x="10.671140939597315" y="20.53691275167785" width="8.456375838926174" height="8.456375838926174" fill="#f29d12"/><rect x="20.53691275167785" y="20.53691275167785" width="8.456375838926174" height="8.456375838926174" fill="#ec3013"/><path d="M24.76510067114094 1.6610738255033557L28.13758389261745 5.033557046979865L24.76510067114094 8.406040268456374L21.392617449664428 5.033557046979865Z" fill="#201e1d"/></g></svg>`

/** Marco doble estilo baraja con rombos en las esquinas. */
export function cardFrame(color: string): string {
  return `<rect x="5" y="5" width="90" height="123" fill="none" stroke="${color}" stroke-width="1.2"/><rect x="8" y="8" width="84" height="117" fill="none" stroke="${color}" stroke-width=".5"/><path d="M8 5L11 8L8 11L5 8Z" fill="${color}"/><path d="M92 5L95 8L92 11L89 8Z" fill="${color}"/><path d="M8 122L11 125L8 128L5 125Z" fill="${color}"/><path d="M92 122L95 125L92 128L89 125Z" fill="${color}"/>`
}

/**
 * Cara de un canto. `glyph` es el contenido interno del <symbol id="mj-{id}">
 * del sprite, sin <use href="#mj-body"/>. Cachea el resultado por id+color.
 */
export function memoriaFaceSvg(glyph: string, color: string = CARD_RED): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 133"><rect width="100" height="133" fill="${CARD_CREAM}"/>${cardFrame(color)}<svg x="17" y="19" width="66" height="95" viewBox="17 4 96 132">${glyph}</svg></svg>`
}

export const svgToDataUri = (svg: string) =>
  'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
