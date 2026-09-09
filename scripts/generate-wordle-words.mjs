// @ts-check
/**
 * Genera los diccionarios de Wordle (español e inglés, 5 y 6 letras).
 *
 *   npm run words:wordle
 *
 * Escribe en public/words/wordle/:
 *   {lang}-{len}-valid.txt    palabras aceptadas como intento
 *   {lang}-{len}-answers.txt  palabras que pueden salir como solución
 *
 * Todo queda NORMALIZADO: mayúsculas, sin tildes y con Ñ convertida en N
 * (regla 13.3 del PRODUCT_SPEC). Las soluciones son un subconjunto de las
 * palabras válidas, filtradas por frecuencia de uso real para que ninguna
 * solución sea una rareza de diccionario, y sin groserías ni nombres propios.
 *
 * Requiere internet. Las listas generadas se versionan en el repo, así que
 * este script solo hace falta para refrescarlas o agregar un idioma nuevo.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../public/words/wordle')

const LENGTHS = [5, 6]
/** Máximo de soluciones por lista: son las N palabras más frecuentes. */
const MAX_ANSWERS = 3000

const SOURCES = {
  // ~636k formas del español (incluye conjugaciones), sin nombres propios.
  esDict: 'https://raw.githubusercontent.com/words/an-array-of-spanish-words/master/index.json',
  // ~275k palabras comunes del inglés, sin nombres propios.
  enDict: 'https://raw.githubusercontent.com/words/an-array-of-english-words/master/index.json',
  // Frecuencia real de uso (OpenSubtitles 2018), ordenada de mayor a menor.
  esFreq:
    'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/es/es_50k.txt',
  enFreq:
    'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_50k.txt',
  // Listas oficiales del Wordle del NYT (solo 5 letras).
  enWordleAnswers:
    'https://raw.githubusercontent.com/Kinkelin/WordleCompetition/main/data/official/shuffled_real_wordles.txt',
  enWordleValid:
    'https://raw.githubusercontent.com/Kinkelin/WordleCompetition/main/data/official/combined_wordlist.txt',
  // Nombres de pila, para que ninguna solución sea un nombre propio.
  esNamesMale: 'https://raw.githubusercontent.com/marcboquet/spanish-names/master/hombres.csv',
  esNamesFemale: 'https://raw.githubusercontent.com/marcboquet/spanish-names/master/mujeres.csv',
  enNames: 'https://raw.githubusercontent.com/dominictarr/random-name/master/first-names.txt',
}

/** Cuántos nombres de pila (los más usados) se descartan por idioma. */
const NAME_LIMIT = 400

/**
 * Raíces vulgares: cualquier solución que empiece con una de estas queda
 * fuera (la app es familiar). Solo afecta a las soluciones; como intento,
 * las palabras se siguen aceptando si están en el diccionario.
 */
const BLOCKED_ROOTS = `
  CAGA CAGO CAGU PUTA PUTO PUTE JODE JODA JODI MEAD MEAR VERGA MIERD CULO CULER
  CHING MARIC MAMAD PENDEJ ZORRA POLLA PICHA COJAN COJAS PEDOS TETAS TETON PENES
  FUCK SHIT BITCH CUNT WHOR SLUT DICK PUSS TITT NIGG FAGG RAPE WANK ARSE CRAP
  PISS HORNY PENIS BOOB
`
  .split(/\s+/)
  .filter(Boolean)

/** Topónimos frecuentes que se colaron en las listas de frecuencia. */
const BLOCKED_PLACES = `
  PARIS LONDON BOSTON GENEVA MEXICO MADRID EUROPA TEXAS MIAMI ROMA CHILE PERU
  CUBA BRASIL FRANCIA ITALIA CANADA ALASKA VEGAS TOKIO BERLIN LISBOA EGIPTO
`
  .split(/\s+/)
  .filter(Boolean)

/** Nombres de pila que también son palabras comunes: se conservan. */
const ALLOWED_NAMES = `
  CLARA PERLA PILAR GLORIA AURORA PALOMA NIEVES OLIVA LUCES ROSAS AMPARO CONSUELO
  ESPERANZA MILAGROS SOLEDAD ANGEL CRUZ REYES ROSA LUNA ALBA IRIS FLORA
  GRACE ROSE MAY JUNE APRIL DAISY IVY HOPE FAITH JOY PEARL RUBY AMBER OLIVE
  BASIL WILL MARK BILL DREW ART FRANK CHINA SUNNY HAZEL SUMMER AUTUMN
`
  .split(/\s+/)
  .filter(Boolean)

/** Mayúsculas, sin tildes, Ñ → N. */
function normalize(word) {
  return word
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

const ONLY_LETTERS = /^[A-Z]+$/

async function fetchText(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} — ${url}`)
  return response.text()
}

async function fetchJsonWords(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} — ${url}`)
  return /** @type {string[]} */ (await response.json())
}

/** Palabras normalizadas de una lista cruda, agrupadas por longitud. */
function byLength(words) {
  /** @type {Map<number, Set<string>>} */
  const map = new Map(LENGTHS.map((length) => [length, new Set()]))

  for (const raw of words) {
    const word = normalize(raw.trim())
    if (!ONLY_LETTERS.test(word)) continue
    map.get(word.length)?.add(word)
  }

  return map
}

/** Palabras de una lista de frecuencia (`palabra cuenta`), de mayor a menor uso. */
function frequencyOrder(text) {
  /** @type {string[]} */
  const ordered = []
  const seen = new Set()

  for (const line of text.split('\n')) {
    const word = normalize(line.split(' ')[0]?.trim() ?? '')
    if (!ONLY_LETTERS.test(word) || seen.has(word)) continue
    seen.add(word)
    ordered.push(word)
  }

  return ordered
}

/** Nombres de pila que sí deben descartarse (no son palabras comunes). */
function buildNameFilter(names) {
  const allowed = new Set(ALLOWED_NAMES)
  return new Set(
    names.map(normalize).filter((name) => ONLY_LETTERS.test(name) && !allowed.has(name))
  )
}

function isBlockedAnswer(word, names) {
  if (BLOCKED_PLACES.includes(word)) return true
  if (names.has(word)) return true
  return BLOCKED_ROOTS.some((root) => word.startsWith(root))
}

function pickAnswers(frequencyRanked, validSet, length, names) {
  const answers = []

  for (const word of frequencyRanked) {
    if (word.length !== length) continue
    if (!validSet.has(word)) continue
    if (isBlockedAnswer(word, names)) continue
    answers.push(word)
    if (answers.length >= MAX_ANSWERS) break
  }

  return answers
}

async function writeList(name, words) {
  const sorted = [...new Set(words)].sort()
  await writeFile(resolve(OUT_DIR, name), sorted.join('\n') + '\n', 'utf8')
  console.log(`  ${name.padEnd(22)} ${String(sorted.length).padStart(6)} palabras`)
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  console.log('Descargando fuentes…')
  const [
    esDict,
    enDict,
    esFreqText,
    enFreqText,
    enAnswersText,
    enValidText,
    esMaleText,
    esFemaleText,
    enNamesText,
  ] = await Promise.all([
    fetchJsonWords(SOURCES.esDict),
    fetchJsonWords(SOURCES.enDict),
    fetchText(SOURCES.esFreq),
    fetchText(SOURCES.enFreq),
    fetchText(SOURCES.enWordleAnswers),
    fetchText(SOURCES.enWordleValid),
    fetchText(SOURCES.esNamesMale),
    fetchText(SOURCES.esNamesFemale),
    fetchText(SOURCES.enNames),
  ])

  // Los CSV vienen ordenados por frecuencia de uso del nombre.
  const csvNames = (text) =>
    text
      .split('\n')
      .slice(1, NAME_LIMIT + 1)
      .map((line) => line.split(',')[0]?.trim() ?? '')
  const esNames = buildNameFilter([...csvNames(esMaleText), ...csvNames(esFemaleText)])
  const enNames = buildNameFilter(enNamesText.split('\n').map((line) => line.trim()))

  const es = byLength(esDict)
  const en = byLength(enDict)
  const esFreq = frequencyOrder(esFreqText)
  const enFreq = frequencyOrder(enFreqText)

  const stripComments = (text) =>
    text
      .split('\n')
      .map((line) => normalize(line.trim()))
      .filter((line) => ONLY_LETTERS.test(line))

  const enOfficialAnswers = stripComments(enAnswersText).filter((word) => word.length === 5)
  const enOfficialValid = stripComments(enValidText).filter((word) => word.length === 5)

  console.log('\nEscribiendo listas…')

  for (const length of LENGTHS) {
    // --- Español -------------------------------------------------------
    const esValid = es.get(length) ?? new Set()
    const esAnswers = pickAnswers(esFreq, esValid, length, esNames)
    await writeList(`es-${length}-valid.txt`, [...esValid, ...esAnswers])
    await writeList(`es-${length}-answers.txt`, esAnswers)

    // --- Inglés --------------------------------------------------------
    const enValid = new Set(en.get(length) ?? [])
    if (length === 5) for (const word of enOfficialValid) enValid.add(word)

    const enAnswers =
      length === 5
        ? enOfficialAnswers.filter((word) => !BLOCKED_ROOTS.some((root) => word.startsWith(root)))
        : pickAnswers(enFreq, enValid, length, enNames)

    for (const word of enAnswers) enValid.add(word)

    await writeList(`en-${length}-valid.txt`, [...enValid])
    await writeList(`en-${length}-answers.txt`, enAnswers)
  }

  console.log(`\nListo. Archivos en ${OUT_DIR}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
