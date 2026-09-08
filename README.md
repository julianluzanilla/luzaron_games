# Luzaron Games

Luzaron Games es una PWA familiar de juegos mentales, gratuita, sin anuncios, instalable y usable offline.

URL de producción:

https://games.luzaron.uk

## Estado actual

Reinicio del proyecto (v1 mínima): solo **Queens** está implementado, sin usuarios, sin
sincronización, sin service worker todavía. Ver `docs/PRODUCT_SPEC.md` y `docs/BACKLOG.md`
para el alcance completo planeado. Sudoku y Wordle son la siguiente fase.

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

## Juegos iniciales

- Queens
- Sudoku (próximamente)
- Wordle (próximamente)

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
