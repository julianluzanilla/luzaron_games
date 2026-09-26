/**
 * Service worker de Luzaron Games — plantilla.
 *
 * vite.config.js la copia a `dist/sw.js` al final de cada build, cambiando
 * `self.__PRECACHE__` por la lista de archivos (con su hash) y
 * `self.__VERSION__` por la versión. No se sirve en desarrollo.
 *
 * Reglas:
 * - Se guarda TODO el build (páginas, JS, CSS, fuentes, arte, niveles y
 *   diccionarios) para que la app abra y se juegue en modo avión.
 * - `/api/*` y `version.json` nunca pasan por la caché.
 * - Actualización automática "al reabrir": el SW nuevo se instala en segundo
 *   plano, toma el control en cuanto termina, pero NO recarga la página. La
 *   partida en curso sigue con el código viejo; la próxima vez que se abra la
 *   app ya arranca con la versión nueva.
 * - Un archivo que no cambió entre versiones se copia de la caché anterior en
 *   vez de volver a bajarlo.
 */

/* eslint-disable no-restricted-globals */

const PRECACHE = self.__PRECACHE__
const VERSION = self.__VERSION__

const PREFIX = 'luzaron-precache-'
const CACHE = PREFIX + hashList(PRECACHE)
const RUNTIME = 'luzaron-runtime-v1'

/** url → llave interna con su revisión. */
const KEY_OF = new Map(PRECACHE.map((entry) => [entry.url, keyFor(entry)]))

function keyFor(entry) {
  return new URL(`${entry.url}?__rev=${entry.rev}`, self.location.origin).href
}

function hashList(list) {
  let hash = 0
  const text = list.map((entry) => entry.url + entry.rev).join('|')
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) | 0
  }
  return (hash >>> 0).toString(36)
}

async function findInOldCaches(key) {
  const names = await caches.keys()
  for (const name of names) {
    if (!name.startsWith(PREFIX) || name === CACHE) continue
    const hit = await (await caches.open(name)).match(key)
    if (hit) return hit
  }
  return null
}

async function precacheAll() {
  const cache = await caches.open(CACHE)

  // De a 6 en paralelo: suficiente para no tardar y sin ahogar la red del hotel.
  const queue = [...PRECACHE]
  const worker = async () => {
    while (queue.length > 0) {
      const entry = queue.shift()
      const key = keyFor(entry)

      if (await cache.match(key)) continue

      const reused = await findInOldCaches(key)
      if (reused) {
        await cache.put(key, reused)
        continue
      }

      const response = await fetch(new Request(entry.url, { cache: 'reload' }))
      if (!response.ok) throw new Error(`No se pudo guardar ${entry.url} (${response.status})`)
      await cache.put(key, await withoutRedirect(response))
    }
  }

  await Promise.all(Array.from({ length: 6 }, worker))
}

async function isComplete() {
  const cache = await caches.open(CACHE)
  const keys = new Set((await cache.keys()).map((request) => request.url))
  return PRECACHE.every((entry) => keys.has(keyFor(entry)))
}

async function broadcastStatus() {
  const ready = await isComplete()
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
  clients.forEach((client) => client.postMessage({ type: 'SW_STATUS', version: VERSION, ready }))
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheAll().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(
        names
          .filter((name) => name.startsWith(PREFIX) && name !== CACHE)
          .map((name) => caches.delete(name))
      )
      await self.clients.claim()
      await broadcastStatus()
    })()
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'GET_STATUS') return

  event.waitUntil(
    isComplete().then((ready) => {
      event.source?.postMessage({ type: 'SW_STATUS', version: VERSION, ready })
    })
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request

  if (request.method !== 'GET') return

  const url = new URL(request.url)

  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return
  if (url.pathname === '/version.json' || url.pathname === '/sw.js') return

  // Cualquier navegación (/, /#/queens, …) es la misma página (index.html, guardada como '/'): router por hash.
  if (request.mode === 'navigate') {
    event.respondWith(fromPrecache('/', request))
    return
  }

  if (KEY_OF.has(url.pathname)) {
    event.respondWith(fromPrecache(url.pathname, request))
    return
  }

  // Algo que no venía en el build (no debería pasar): red y, si falla, lo último que haya.
  event.respondWith(
    (async () => {
      const runtime = await caches.open(RUNTIME)
      try {
        const response = await fetch(request)
        if (response.ok) await runtime.put(request, response.clone())
        return response
      } catch (error) {
        const hit = await runtime.match(request)
        if (hit) return hit
        throw error
      }
    })()
  )
})

async function fromPrecache(path, request) {
  const cache = await caches.open(CACHE)
  const hit = await cache.match(KEY_OF.get(path))
  if (hit) return hit

  // Todavía instalando (primera visita): se va a la red.
  return fetch(request)
}

/**
 * Safari rechaza navegaciones servidas con una respuesta que vino de una
 * redirección (Pages quita el `.html` de las URLs). Se copia sin esa marca.
 */
async function withoutRedirect(response) {
  if (!response.redirected) return response
  const body = await response.blob()
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
}
