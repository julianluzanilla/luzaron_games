# Luzaron Games

Luzaron Games es una PWA familiar de juegos mentales, gratuita, sin anuncios, instalable y usable offline.

URL de producción:

https://games.luzaron.uk

## Estado actual

Reinicio del proyecto (v1 mínima): **Queens** y **Wordle** están implementados, sin usuarios,
sin sincronización, sin service worker todavía. Ver `docs/PRODUCT_SPEC.md` y `docs/BACKLOG.md`
para el alcance completo planeado. Sudoku es la siguiente fase.

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
PRODUCT_SPEC), así que el jugador escribe sin acentos. Las soluciones son solo palabras
frecuentes de verdad, sin nombres propios ni groserías; como intento se acepta el diccionario
completo.

Para regenerarlas (requiere internet):

```powershell
npm run words:wordle
```

Fuentes: `an-array-of-spanish-words` y `an-array-of-english-words` (diccionarios),
`hermitdave/FrequencyWords` (frecuencia de uso real en subtítulos) y las listas oficiales del
Wordle del New York Times para el inglés de 5 letras.

La palabra diaria se calcula en el cliente: la lista de soluciones se baraja con una semilla
fija por idioma y longitud, y el día del calendario elige el índice. Sale igual en todos los
dispositivos y no se repite hasta agotar la lista (más de 6 años de palabras por modo).

## Juegos iniciales

- Queens
- Wordle
- Sudoku (próximamente)

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
