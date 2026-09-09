# Luzaron Games

Luzaron Games es una PWA familiar de juegos mentales, gratuita, sin anuncios, instalable y usable offline.

URL de producción:

https://games.luzaron.uk

## Estado actual

Los cuatro juegos están implementados: **Queens**, **Sudoku**, **Wordle** y **Mahjong
Solitario**. La app abre en una **pantalla de inicio** con las cuatro miniaturas, tiene
**modo claro / oscuro / automático** y **usuarios reales** contra Cloudflare D1. Sigue sin
service worker, así que todavía no hay caché offline de verdad.

Ver `docs/PRODUCT_SPEC.md` y `docs/BACKLOG.md` para el alcance completo.

## Navegación

Todo va por hash, así no hace falta configurar reescrituras en Cloudflare Pages:

| Ruta | Pantalla |
| --- | --- |
| `#/` | Inicio: las cuatro miniaturas |
| `#/queens`, `#/sudoku`, `#/wordle`, `#/mahjong` | Los juegos |
| `#/ajustes` | Tema y cuenta |
| `#/admin` | Alta de usuarios (solo rol admin) |

## Tema claro y oscuro

`src/shell/theme.ts` pone `data-theme="light"` o `"dark"` en `<html>` y guarda la
preferencia en localStorage. En **Automático** sigue a `prefers-color-scheme` y reacciona en
vivo si el sistema cambia solo al anochecer.

Todos los colores salen de variables CSS: `:root` trae el tema oscuro completo y
`:root[data-theme='light']` solo cambia lo que tiene que cambiar. Cada juego tiene además
su propio bloque de tokens (`--sudoku-*`, `--wordle-*`, `--mahjong-*`). **Si algo se ve mal
en modo día, se arregla en esos bloques, nunca en la regla que usa el color.**

`index.html` aplica el tema con un script en línea antes de pintar; sin eso la app abre en
blanco un instante antes de saltar a oscuro.

## Usuarios, sesión y récords

- Se entra jugando: sin sesión eres **Invitado**, juegas todo y **no se guarda nada**.
- Las cuentas las crea el **administrador** desde `#/admin`. No hay auto-registro.
- La contraseña es simple (4+, letras y números, PRODUCT_SPEC §5) pero se guarda con
  **PBKDF2-SHA256 de 210 000 vueltas**, nunca en claro.
- **La sesión no caduca**: la cookie va a diez años y solo termina al cerrar sesión, al
  desactivar la cuenta o al cambiarle la contraseña desde el panel.
- Los récords se guardan primero en **IndexedDB** y se suben al backend en cuanto hay red.
  Cada uno lleva un `clientId` que hace la subida idempotente, así que reintentar a ciegas
  nunca duplica. Se puede jugar un fin de semana sin internet y no se pierde nada.
- Solo cuenta como récord una partida **sin pistas** (en Mahjong, además, sin barajar y sin
  deshacer).

### Poner en marcha la base D1

```powershell
npx wrangler d1 create luzaron-games      # copia el database_id a wrangler.toml
npm run db:schema                          # crea las tablas en producción
```

Después hay que dar de alta el binding `DB` en el panel de Cloudflare
(Workers & Pages → luzaron-games → Settings → Bindings), **en Production y en Preview**:
`wrangler.toml` no lo configura solo.

Con la base vacía, la primera visita a `#/ajustes` ofrece **crear el administrador**. Ese
endpoint (`/api/auth/setup`) se cierra para siempre en cuanto existe un usuario.

### Endpoints

| Método y ruta | Qué hace |
| --- | --- |
| `GET /api/auth/me` | Quién soy y si falta crear el admin |
| `POST /api/auth/login` · `/logout` · `/setup` | Sesión |
| `GET /api/users` · `POST /api/users` · `PATCH /api/users/:id` | Panel de admin |
| `POST /api/records` | Sube la cola de partidas |
| `GET /api/records/bests` | Mejor tiempo por categoría |
| `GET /api/rankings` | Top 3 de un puzzle, solo partidas limpias |

## Puzzles de Queens: generación automática

Los puzzles de Queens **no se generan en el navegador** (para tableros grandes puede tardar
segundos en garantizar que la solución sea única). En vez de eso, se generan offline con un
script y se guardan como JSON en `public/levels/queens/`. La app solo lee ese banco.

Para generar más puzzles o agregar un tamaño nuevo:

```powershell
npm run pool:queens -- --sizes 8,9 --target 80
```

`--target` es cuántos puzzles quieres en total por tamaño (no duplica los que ya existen).
El tamaño 12x12 es el más lento de generar (puede tardar minutos); es normal dejarlo corriendo
en segundo plano.

## Wordle: diccionarios

Wordle usa listas de palabras estáticas en `public/words/wordle/`, dos por idioma y longitud:

- `{es|en}-{5|6}-valid.txt` — palabras aceptadas como intento.
- `{es|en}-{5|6}-answers.txt` — palabras que pueden salir como solución.

Todas están normalizadas (mayúsculas, sin tildes y con Ñ convertida en N, regla 13.3 del
PRODUCT_SPEC), así que el jugador escribe sin acentos.

| Lista | Intentos | Soluciones |
| ----- | -------: | ---------: |
| es-5  |    6,914 |        800 |
| es-6  |   15,521 |        800 |
| en-5  |   12,972 |      2,310 |
| en-6  |    8,233 |        800 |

**Intentos**: en español se validan contra el diccionario hunspell **es-MX** (RAE más
mexicanismos: elote, alberca, chamarra, cuate, jitomate, platicar…), así que lo que el juego
acepta es el español que se habla en México.

**Soluciones**: mucho más estrictas, porque el juego es familiar. Son solo las 800 palabras
más frecuentes del idioma que además:

- No son formas verbales conjugadas. Se descartan con el listado de lemas de
  `michmech/lemmatization-lists` y el lemario de verbos de `olea/lemarios`, para que nunca
  salga algo como CUNDA, ACUDA o ABRAN. Sí entran los infinitivos, los participios que
  funcionan como adjetivo y los sustantivos que coinciden con un verbo (ABRIGO, ABRAZO).
- No son nombres propios, topónimos, groserías ni palabras funcionales.
- No son términos que solo se usan en España (zumo, patata, móvil, gafas) ni palabras que en
  México son vulgares aunque en España no lo sean.

El inglés de 5 letras usa la lista oficial del Wordle del New York Times. El de 6 sigue el
mismo criterio que el español: sin plurales ni formas -ed/-ing, sin nombres propios y solo
las más frecuentes.

Para regenerarlas (requiere internet y `npm install`):

```powershell
npm run words:wordle
```

Fuentes: `words/an-array-of-spanish-words` y `words/an-array-of-english-words`
(diccionarios base), `wooorm/dictionaries` (hunspell es-MX e inglés),
`hermitdave/FrequencyWords` (frecuencia de uso real en subtítulos),
`michmech/lemmatization-lists` y `olea/lemarios` (lemas y verbos),
`Kinkelin/WordleCompetition` (listas oficiales del NYT) y `marcboquet/spanish-names` más
`dominictarr/random-name` (nombres propios a descartar).

La palabra diaria se calcula en el cliente: la lista de soluciones se baraja con una semilla
fija por idioma y longitud, y el día del calendario elige el índice. Sale igual en todos los
dispositivos y no se repite hasta agotar la lista (más de 2 años por modo).

## Juegos iniciales

- Queens
- Sudoku
- Wordle
- Mahjong Solitario

## Stack técnico

- Vite
- TypeScript
- HTML
- CSS
- PWA
- Service Worker
- Web App Manifest
- GitHub
- Cloudflare Pages
- Cloudflare Pages Functions
- Cloudflare D1

## Requisitos locales

Instalar:

- Git
- Node.js
- npm
- Visual Studio Code

## Instalar proyecto en una computadora nueva

```powershell
cd C:\
mkdir dev
cd dev
git clone https://github.com/julianluzanilla/luzaron_games.git
cd luzaron_games
npm install
npm run dev
```
