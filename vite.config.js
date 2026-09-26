// @ts-check
/**
 * Configuración de Vite.
 *
 * Hace dos cosas además de lo normal:
 *
 * 1. **Versión del sistema.** Se calcula en cada build desde git (fecha y hora
 *    del último commit en hora de Hermosillo + hash corto) y se inyecta como
 *    `__APP_VERSION__`. También se escribe `dist/version.json`, que la app pide
 *    sin caché para comparar lo que tiene instalado contra lo publicado.
 *
 * 2. **Service worker propio (offline).** Al terminar el build se recorre
 *    `dist/`, se saca un hash de cada archivo y se genera `dist/sw.js` desde
 *    `scripts/sw-template.js` con esa lista. No se usa vite-plugin-pwa a
 *    propósito: instalarlo desde el VM Linux mete binarios que no sirven en
 *    Windows, y esto son ~150 líneas sin dependencias.
 */

import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { defineConfig } from 'vite'

/** Git no guarda la hora del push; se usa la del commit (subir.ps1 hace ambos seguidos). */
function readVersion() {
  let commit = process.env.CF_PAGES_COMMIT_SHA?.slice(0, 7) ?? ''
  let iso = ''

  try {
    commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
    iso = execSync('git log -1 --format=%cI', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    // Sin git (o sin historial): se usa la hora del build.
  }

  const date = iso ? new Date(iso) : new Date()
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Hermosillo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  )

  const stamp = `${parts.year}.${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`

  return {
    label: commit ? `${stamp} · ${commit}` : stamp,
    commit: commit || 'local',
    date: date.toISOString(),
    fromGit: Boolean(iso),
  }
}

const VERSION = readVersion()

/** Lo que no vale la pena guardar en el teléfono. */
const SKIP = [
  /^sw\.js$/,
  /^version\.json$/,
  /^_headers$/,
  /^_redirects$/,
  /^screenshots\//,
  /\.map$/,
]

function listFiles(dir) {
  /** @type {string[]} */
  const out = []

  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...listFiles(full))
    else out.push(full)
  }

  return out
}

/** @returns {import('vite').Plugin} */
function offlinePlugin() {
  /** @type {string} */
  let outDir = 'dist'
  let root = process.cwd()

  return {
    name: 'luzaron-offline',
    apply: 'build',
    configResolved(config) {
      root = config.root
      outDir = join(config.root, config.build.outDir)
    },
    closeBundle() {
      const entries = listFiles(outDir)
        .map((file) => relative(outDir, file).split(sep).join('/'))
        .filter((path) => !SKIP.some((pattern) => pattern.test(path)))
        .sort()
        .map((path) => ({
          // Pages redirige /index.html → /, así que la página se guarda como '/'.
          url: path === 'index.html' ? '/' : `/${path}`,
          rev: createHash('sha256')
            .update(readFileSync(join(outDir, path)))
            .digest('hex')
            .slice(0, 12),
        }))

      const bytes = entries.reduce(
        (sum, entry) =>
          sum + statSync(join(outDir, entry.url === '/' ? 'index.html' : entry.url.slice(1))).size,
        0
      )

      const template = readFileSync(join(root, 'scripts', 'sw-template.js'), 'utf8')
      const sw = template
        .replace(
          'const PRECACHE = self.__PRECACHE__',
          `const PRECACHE = ${JSON.stringify(entries)}`
        )
        .replace(
          'const VERSION = self.__VERSION__',
          `const VERSION = ${JSON.stringify(VERSION.label)}`
        )

      if (sw.includes('= self.__'))
        throw new Error('[offline] sw-template.js: no se sustituyó la lista')

      writeFileSync(join(outDir, 'sw.js'), sw)
      writeFileSync(join(outDir, 'version.json'), JSON.stringify(VERSION, null, 2) + '\n')

      console.log(
        `\n[offline] sw.js: ${entries.length} archivos, ${(bytes / 1024 / 1024).toFixed(2)} MB · versión ${VERSION.label}`
      )
    },
  }
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(VERSION),
  },
  plugins: [offlinePlugin()],
})
