# Fichas de Mahjong — arte editable

El juego carga **un solo archivo**: `public/art/mahjong/mahjong-tiles.svg`, un sprite con
las 42 caras como `<symbol id="mj-…">`. Esta carpeta es la versión editable a mano de ese
mismo arte, una cara por archivo.

## Verlas todas

Abre **`index.html`** con doble clic. Salen las 42 agrupadas por palo, con su id, y un
selector de tamaño (46 px = móvil, 62 px = tamaño de juego, 180 px = detalle).

## Cambiar una ficha

1. Abre `tiles/<id>.svg` en el editor (Inkscape, Illustrator, VS Code…).
2. Modifica **solo lo que está dentro de `<g id="face">`**. Es lo único que se lee al
   reconstruir el sprite; el resto del archivo está ahí para que la ficha se vea completa
   al abrirla suelta.
3. `npm run art:mahjong` — rehace `public/art/mahjong/mahjong-tiles.svg`.
4. `npm run dev` y a revisar.

El sistema de coordenadas de la cara es **82 × 118**, con el origen ya desplazado por el
`translate(9,11)` del grupo. El centro de la cara es `(41, 59)`.

## Cambiar el cuerpo de la ficha

El marfil, el canto del falso 3D y el brillo son comunes a las 42 y viven en
**`_tile-body.svg`**: los degradados van en su `<defs>` y el dibujo en `<g id="mj-body">`
(el reverso, en `<g id="mj-body-back">`). Editar el cuerpo dentro de un `tiles/*.svg` no
sirve de nada: se ignora.

## Ids

`p1`–`p9` círculos · `s1`–`s9` bambúes · `m1`–`m9` caracteres ·
`we ws ww wn` vientos · `dr dg dw` dragones · `f1`–`f4` flores · `e1`–`e4` estaciones.

## Volver a partir el sprite

Si alguna vez editas el sprite directamente y quieres bajar el cambio a los archivos
sueltos: `npm run art:mahjong:split`. **Sobrescribe** las 42 caras y `_tile-body.svg`.

El viaje de ida y vuelta es exacto: partir y reconstruir devuelve el sprite byte a byte.

## Nota

Esta carpeta **no se publica**. Vite solo copia `public/`, así que las 42 sueltas y el
`index.html` se quedan en el repo y no engordan el juego.
