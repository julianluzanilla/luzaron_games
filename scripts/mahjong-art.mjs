/**
 * Las fichas de Mahjong viven en dos formas:
 *
 *   public/art/mahjong/mahjong-tiles.svg   ← lo que carga el juego (un sprite)
 *   art/mahjong/                            ← lo editable a mano, una cara por archivo
 *
 * Este script convierte entre las dos:
 *
 *   node scripts/mahjong-art.mjs split   sprite  → archivos sueltos (+ index.html)
 *   node scripts/mahjong-art.mjs build   sueltos → sprite      (npm run art:mahjong)
 *
 * Al editar a mano, lo único que se lee de cada archivo suelto es su
 * <g id="face">…</g>. El cuerpo de la ficha (marfil, canto, brillo) es común a
 * las 42 y se edita una sola vez en art/mahjong/_tile-body.svg.
 */

import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const SPRITE = path.join(ROOT, 'public/art/mahjong/mahjong-tiles.svg')
const ART = path.join(ROOT, 'art/mahjong')
const TILES = path.join(ART, 'tiles')
const BODY_FILE = path.join(ART, '_tile-body.svg')

const VIEWBOX = '0 0 112 152'
const FACE_OPEN = '<g transform="translate(9,11)">'

const NUM = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
const CATALOG = [
  ...NUM.map((n) => [`p${n}`, `Círculos ${n}`, 'Círculos']),
  ...NUM.map((n) => [`s${n}`, `Bambú ${n}`, 'Bambúes']),
  ...NUM.map((n) => [`m${n}`, `Caracteres ${n}`, 'Caracteres']),
  ['we', 'Viento este', 'Vientos'],
  ['ws', 'Viento sur', 'Vientos'],
  ['ww', 'Viento oeste', 'Vientos'],
  ['wn', 'Viento norte', 'Vientos'],
  ['dr', 'Dragón rojo', 'Dragones'],
  ['dg', 'Dragón verde', 'Dragones'],
  ['dw', 'Dragón blanco', 'Dragones'],
  ['f1', 'Flor: ciruelo', 'Flores'],
  ['f2', 'Flor: orquídea', 'Flores'],
  ['f3', 'Flor: crisantemo', 'Flores'],
  ['f4', 'Flor: bambú', 'Flores'],
  ['e1', 'Estación: primavera', 'Estaciones'],
  ['e2', 'Estación: verano', 'Estaciones'],
  ['e3', 'Estación: otoño', 'Estaciones'],
  ['e4', 'Estación: invierno', 'Estaciones'],
]
const NAMES = new Map(CATALOG.map(([id, name]) => [id, name]))

function cut(text, open, close, from = 0) {
  const start = text.indexOf(open, from)
  if (start < 0) throw new Error(`no encontré ${open}`)
  const end = text.indexOf(close, start)
  if (end < 0) throw new Error(`no encontré el cierre de ${open}`)
  return { inner: text.slice(start + open.length, end), after: end + close.length }
}

// ---------------------------------------------------------------- split

function split() {
  const sprite = fs.readFileSync(SPRITE, 'utf8')

  const defs = cut(sprite, '<defs>', '</defs>')
  const body = cut(sprite, '<g id="mj-body">', '</g>', defs.after)
  const back = cut(sprite, '<g id="mj-body-back">', '</g>', body.after)

  fs.mkdirSync(TILES, { recursive: true })

  fs.writeFileSync(
    BODY_FILE,
    [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + VIEWBOX + '" width="112" height="152">',
      '<defs>' + defs.inner + '</defs>',
      '<g id="mj-body">' + body.inner + '</g>',
      '<g id="mj-body-back" style="display:none">' + back.inner + '</g>',
      '</svg>',
    ].join('\n')
  )

  const faces = new Map()
  const re = /<symbol id="mj-([a-z0-9]+)" viewBox="[^"]*">([\s\S]*?)<\/symbol>/g
  let match

  while ((match = re.exec(sprite)) !== null) {
    const [, id, inner] = match
    const open = inner.indexOf(FACE_OPEN)
    if (open < 0) continue // mj-blank y mj-back no tienen cara
    faces.set(id, inner.slice(open + FACE_OPEN.length, inner.lastIndexOf('</g>')))
  }

  let written = 0

  for (const [id, name] of NAMES) {
    const face = faces.get(id)
    if (face === undefined) throw new Error(`al sprite le falta mj-${id}`)

    fs.writeFileSync(
      path.join(TILES, `${id}.svg`),
      [
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" width="112" height="152" role="img" aria-label="${name}">`,
        '<defs>' + defs.inner + '</defs>',
        body.inner,
        '<!-- Solo esto se lee al reconstruir el sprite: -->',
        '<g id="face" transform="translate(9,11)">' + face + '</g>',
        '</svg>',
      ].join('\n')
    )
    written += 1
  }

  writeIndex()
  console.log(`split: ${written} caras en art/mahjong/tiles/ + _tile-body.svg + index.html`)
}

function writeIndex() {
  const groups = []
  for (const [id, name, group] of CATALOG) {
    const last = groups[groups.length - 1]
    if (last && last.title === group) last.items.push([id, name])
    else groups.push({ title: group, items: [[id, name]] })
  }

  const sections = groups
    .map(
      (g) =>
        `<section><h2>${g.title}</h2><div class="row">` +
        g.items
          .map(
            ([id, name]) =>
              `<figure><img src="tiles/${id}.svg" alt="${name}"><figcaption><b>${id}</b><span>${name}</span></figcaption></figure>`
          )
          .join('') +
        '</div></section>'
    )
    .join('\n')

  fs.writeFileSync(
    path.join(ART, 'index.html'),
    `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Fichas de Mahjong · Luzarón Games</title>
<style>
:root{--w:96px}
body{margin:0;background:#123024;color:#eef2ff;font:15px/1.5 system-ui,sans-serif;padding:24px}
h1{margin:0 0 4px;font-size:24px}
p.lede{margin:0 0 20px;color:#a9c6b5}
h2{font-size:15px;letter-spacing:.08em;text-transform:uppercase;color:#8fd9b3;margin:26px 0 10px;
   border-bottom:1px solid #24483a;padding-bottom:6px}
.row{display:flex;flex-wrap:wrap;gap:18px 14px}
figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:6px}
img{width:var(--w);height:auto;display:block;filter:drop-shadow(2px 3px 3px rgba(0,0,0,.45))}
figcaption{display:flex;flex-direction:column;align-items:center;line-height:1.2}
figcaption b{font:600 12px ui-monospace,monospace;color:#f2b705}
figcaption span{font-size:11.5px;color:#a9c6b5}
.sizes{display:flex;gap:8px;align-items:center;margin-bottom:8px}
button{font:600 13px system-ui;padding:7px 12px;border:1px solid #2f5a48;border-radius:8px;
       background:#19402f;color:#eef2ff;cursor:pointer}
button[aria-pressed=true]{background:#2fbf71;border-color:#2fbf71;color:#04180d}
</style></head><body>
<h1>Fichas de Mahjong</h1>
<p class="lede">Cada imagen es <code>art/mahjong/tiles/&lt;id&gt;.svg</code>. Edita el
<code>&lt;g id="face"&gt;</code> de la que quieras y corre <code>npm run art:mahjong</code>
para rehacer el sprite del juego.</p>
<div class="sizes"><b>Tamaño</b>
<button data-w="46">Móvil 46</button>
<button data-w="62">Juego 62</button>
<button data-w="96" aria-pressed="true">96</button>
<button data-w="180">Detalle 180</button></div>
${sections}
<script>
document.querySelector('.sizes').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return
  document.querySelectorAll('.sizes button').forEach((x) => x.setAttribute('aria-pressed', x === b))
  document.documentElement.style.setProperty('--w', b.dataset.w + 'px')
})
</script>
</body></html>
`
  )
}

// ---------------------------------------------------------------- build

function build() {
  const bodySrc = fs.readFileSync(BODY_FILE, 'utf8')
  const defs = cut(bodySrc, '<defs>', '</defs>')
  const body = cut(bodySrc, '<g id="mj-body">', '</g>', defs.after)
  const back = cut(bodySrc, '<g id="mj-body-back" style="display:none">', '</g>', body.after)

  const symbols = []

  for (const [id, name] of NAMES) {
    const file = path.join(TILES, `${id}.svg`)
    if (!fs.existsSync(file)) throw new Error(`falta art/mahjong/tiles/${id}.svg (${name})`)

    const text = fs.readFileSync(file, 'utf8')
    const start = text.indexOf('<g id="face"')
    if (start < 0) throw new Error(`${id}.svg no tiene <g id="face">`)

    const face = text.slice(text.indexOf('>', start) + 1, text.lastIndexOf('</g>'))

    symbols.push(
      `<symbol id="mj-${id}" viewBox="${VIEWBOX}"><use href="#mj-body"/>` +
        `${FACE_OPEN}${face}</g></symbol>`
    )
  }

  const out = [
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ' +
      `viewBox="${VIEWBOX}" width="0" height="0" ` +
      'style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">',
    '<defs>' + defs.inner + '</defs>',
    `<defs><g id="mj-body">${body.inner}</g><g id="mj-body-back">${back.inner}</g></defs>`,
    `<symbol id="mj-blank" viewBox="${VIEWBOX}"><use href="#mj-body"/></symbol>`,
    `<symbol id="mj-back" viewBox="${VIEWBOX}"><use href="#mj-body-back"/></symbol>`,
    ...symbols,
    '</svg>',
  ].join('\n')

  fs.writeFileSync(SPRITE, out)
  console.log(
    `build: sprite rehecho con ${symbols.length} caras (${Math.round(out.length / 1024)} KB)`
  )
}

const command = process.argv[2]

if (command === 'split') split()
else if (command === 'build') build()
else {
  console.error('uso: node scripts/mahjong-art.mjs split | build')
  process.exit(1)
}
