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
 * (regla 13.3 del PRODUCT_SPEC), así que el jugador escribe sin acentos.
 *
 * Criterios:
 *
 * - Los INTENTOS aceptan todo el diccionario del idioma. En español se validan
 *   contra el diccionario hunspell es-MX (RAE + mexicanismos: elote, alberca,
 *   chamarra, cuate, jitomate…), así que lo que se acepta es el español que se
 *   habla en México.
 * - Las SOLUCIONES son mucho más estrictas, porque el juego es para la familia:
 *   solo las MAX_ANSWERS palabras más frecuentes de la vida real, sin formas
 *   verbales conjugadas (nada de CUNDA, ACUDA o ABRAN), sin nombres propios,
 *   sin groserías y sin términos que solo se usan en España.
 *
 * Requiere internet y `npm install`. Las listas generadas se versionan en el
 * repo, así que este script solo hace falta para refrescarlas.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import nspell from 'nspell'

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../public/words/wordle')

const LENGTHS = [5, 6]

/** Cuántas soluciones por lista (las más frecuentes). ~2 años de palabra diaria. */
const MAX_ANSWERS = 800

/** Cuántos nombres de pila (los más usados) se descartan por idioma. */
const NAME_LIMIT = 400

const SOURCES = {
  // Diccionarios base: formas completas, sin nombres propios.
  esDict: 'https://raw.githubusercontent.com/words/an-array-of-spanish-words/master/index.json',
  enDict: 'https://raw.githubusercontent.com/words/an-array-of-english-words/master/index.json',
  // Diccionarios hunspell: es-MX (RAE + mexicanismos) e inglés.
  esAff: 'https://raw.githubusercontent.com/wooorm/dictionaries/main/dictionaries/es-MX/index.aff',
  esDic: 'https://raw.githubusercontent.com/wooorm/dictionaries/main/dictionaries/es-MX/index.dic',
  enAff: 'https://raw.githubusercontent.com/wooorm/dictionaries/main/dictionaries/en/index.aff',
  enDic: 'https://raw.githubusercontent.com/wooorm/dictionaries/main/dictionaries/en/index.dic',
  // Frecuencia real de uso (OpenSubtitles 2018), de mayor a menor.
  esFreq:
    'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/es/es_50k.txt',
  enFreq:
    'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_50k.txt',
  // Lemas: sirven para reconocer (y descartar) las formas verbales conjugadas.
  esLemmas:
    'https://raw.githubusercontent.com/michmech/lemmatization-lists/master/lemmatization-es.txt',
  enLemmas:
    'https://raw.githubusercontent.com/michmech/lemmatization-lists/master/lemmatization-en.txt',
  esVerbs: 'https://raw.githubusercontent.com/olea/lemarios/master/verbos-espanol.txt',
  // Listas oficiales del Wordle del NYT (solo inglés de 5 letras).
  enWordleAnswers:
    'https://raw.githubusercontent.com/Kinkelin/WordleCompetition/main/data/official/shuffled_real_wordles.txt',
  enWordleValid:
    'https://raw.githubusercontent.com/Kinkelin/WordleCompetition/main/data/official/combined_wordlist.txt',
  // Nombres de pila, para que ninguna solución sea un nombre propio.
  esNamesMale: 'https://raw.githubusercontent.com/marcboquet/spanish-names/master/hombres.csv',
  esNamesFemale: 'https://raw.githubusercontent.com/marcboquet/spanish-names/master/mujeres.csv',
  enNames: 'https://raw.githubusercontent.com/dominictarr/random-name/master/first-names.txt',
}

const words = (text) => text.split(/\s+/).filter(Boolean)

/**
 * Raíces vulgares: cualquier solución que empiece con una de estas queda fuera.
 * Solo afecta a las soluciones; como intento se siguen aceptando.
 */
const BLOCKED_ROOTS = words(`
  CAGA CAGO CAGU PUTA PUTO PUTE JODE JODA JODI MEAD MEAR VERGA MIERD CULO CULER
  CHING MARIC MAMAD PENDEJ ZORRA POLLA PICHA COJAN COJAS PEDOS TETAS TETON PENES
  FUCK SHIT BITCH CUNT WHOR SLUT DICK PUSS TITT NIGG FAGG RAPE WANK ARSE CRAP
  PISS HORNY PENIS BOOB
  FOLL VIOLAR VIOLAN VIOLO RAMER BRAGA CARAJO PALIZA VAGIN ABORT SEMEN CABRON
`)

/** Topónimos que se cuelan en las listas de frecuencia. */
const BLOCKED_PLACES = words(`
  PARIS LONDON BOSTON GENEVA MEXICO MADRID EUROPA TEXAS MIAMI ROMA CHILE PERU
  CUBA BRASIL FRANCIA ITALIA CANADA ALASKA VEGAS TOKIO BERLIN LISBOA EGIPTO
  CHINA JAPON RUSIA GRECIA TURQUIA SUECIA NORUEGA
`)

/**
 * Formas verbales que se colaron pese al filtro automático (el listado de lemas
 * las registra como entrada propia) y palabras que en México son vulgares
 * aunque en España no lo sean. Solo se bloquean como solución.
 */
const BLOCKED_FORMS = words(`
  ABRAS BUSCA BUSCO CALLA DEBES DEJAS DEJES DEMOS ESTAS GANAN GRITA HACES HAYAS
  HEMOS MATAS MIRAS MIRES MONTA MUERA PODRE QUEDA QUEDO QUITE QUITO RODEA SACAS
  SALGA SALIA SALIO SERAS TARDA TENIA TOCAS TRATA VAYAS VENDO VENIA VERAS VIVAS
  SALVE SAQUE RUEGO
  ACEPTA ACEPTO AFECTA ALEGRO ATREVE BUSCAS CUELGA ENSENA ESCAPO GOLPEO HABLAS
  INDICA MIENTE MUERAS ORDENO PIENSO PRESTA QUEDAS QUITAS SALGAS SALUDA SABIAS
  TENIAS TENIDO TRATAS VIENES METETE COMIDO VIVIDO
  COGER COGES COGEN COGIDA COGIDO COGIENDO
  COREA BORDA CORRO DOBLA MANDA CIERRO PAGARE PEDIA RESACA
`)

/** Términos que en México no se usan: se aceptan como intento, no como solución. */
const BLOCKED_SPAIN = words(`
  ZUMO ZUMOS PATATA PATATAS MOVIL MOVILES GAFAS CHAVAL CHAVALA CHAVALES CURRO
  CURRAR GUAY CUTRE CUTRES PIJO PIJA PIJOS HOSTIA HOSTIAS NEVERA NEVERAS GRIFO
  GRIFOS FOLIO FOLIOS CABREO FLIPAR CHULO CHULOS TEBEO TEBEOS ACERA ACERAS
  ORDENAD COTILLA CHARCA
`)

/** Nombres de pila que también son palabras comunes: se conservan. */
const ALLOWED_NAMES = words(`
  CLARA PERLA PILAR GLORIA AURORA PALOMA NIEVES OLIVA LUCES ROSAS AMPARO CONSUELO
  SOLEDAD ANGEL CRUZ REYES ROSA LUNA ALBA IRIS FLORA
  GRACE ROSE MAY JUNE APRIL DAISY IVY HOPE FAITH JOY PEARL RUBY AMBER OLIVE
  BASIL WILL MARK BILL DREW ART FRANK SUNNY HAZEL SUMMER AUTUMN
`)

/** Palabras de uso diario en México que faltan en el diccionario hunspell. */
const EXTRA_ES = words(`
  POPOTE POPOTES BANANA BANANAS CHELA CHELAS PANTS TENIS LONCHE
`)

/**
 * Palabras funcionales, extranjerismos, nombres propios y temas que no hacen
 * buena solución para jugar en familia. Se aceptan como intento.
 */
const BLOCKED_EXTRA = words(`
  AQUEL DESDE DONDE HASTA NUNCA ACASO NOMAS QUIEN USTED ELLAS ELLOS ESTOS CUYOS
  SUYAS SUYOS TUYAS TUYOS AMBAS AMBOS TODAS TODOS OTRAS OTROS TENES DINOS VERME
  VEROS ALGUNA ALGUNO ALGUNAS ALGUNOS AQUELLA AQUELLO CUANTA CUANTO CUANTAS
  ADEMAS APARTE SIQUIERA TAMPOCO ULTIMA ULTIMO VARIAS VARIOS MISMAS MISMOS
  GRAND GRANT GREEN CROSS BLUES FLASH SUITE HENRY ROMEO DANTE CONAC POLIS
  INDIA SUIZA MARTE VENUS NAZIS PORNO SEMEN
  ADONDE AUNQUE PORQUE CUANDO CUALES DEBAJO DENTRO CONTRA PRONTO MUCHAS MUCHOS
  TANTAS TANTOS PRIMER TERCER PEORES ENTRE SEGUN SOBRE
  CRISTO PAMELA MILORD JERSEY BRANDY RUPIAS JUNIOR CAMPUS SEXUAL
  LIGHT BURDEL TARADO VOMITO PILLAR JOHNNY CARTER
  MILAN JORDAN COLIN ESTES VENDI RECIBI VALIA
  DEMAS ALGUN NINGUN QUIZA QUIZAS ATRAS DETRAS TRAVES RECIEN
`)

/** Mayúsculas, sin tildes, Ñ → N. */
function normalize(word) {
  return word
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

const ONLY_LETTERS = /^[A-Z]+$/

/**
 * Variantes con acento de una palabra ya normalizada. El diccionario base viene
 * SIN tildes ("varon", "camion"), pero el diccionario hunspell solo conoce la
 * forma correcta ("varón", "camión"), así que hay que probar las combinaciones.
 */
const ACCENTS = {
  a: ['a', 'á'],
  e: ['e', 'é'],
  i: ['i', 'í'],
  o: ['o', 'ó'],
  u: ['u', 'ú', 'ü'],
  n: ['n', 'ñ'],
}

/** Tope de combinaciones a probar por palabra, para no dispararse. */
const MAX_VARIANTS = 96

function accentVariants(word) {
  let variants = ['']

  for (const letter of word.toLowerCase()) {
    const options = ACCENTS[letter] ?? [letter]
    const next = []

    for (const prefix of variants) {
      for (const option of options) next.push(prefix + option)
    }

    // Palabras con muchas vocales dispararían las combinaciones: en ese caso
    // basta con la forma sin acentos, que ya se probó antes.
    if (next.length > MAX_VARIANTS) return []

    variants = next
  }

  return variants
}

/**
 * ¿La palabra existe en el diccionario del idioma, ignorando acentos? Se prueba
 * la forma tal cual y, si no, cada variante acentuada.
 */
function existsInDictionary(spell, raw, normalized) {
  if (spell.correct(raw)) return true

  for (const variant of accentVariants(normalized)) {
    if (spell.correct(variant)) return true
  }

  return false
}

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

/** Palabras de una lista de frecuencia (`palabra cuenta`), de mayor a menor uso. */
function frequencyOrder(text) {
  const ordered = []
  const seen = new Set()

  for (const line of text.split('\n')) {
    const word = line.split(' ')[0]?.trim() ?? ''
    const key = normalize(word)
    if (!ONLY_LETTERS.test(key) || seen.has(key)) continue
    seen.add(key)
    ordered.push(word)
  }

  return ordered
}

/**
 * Índice de lemas: para cada forma, a qué palabra de diccionario corresponde.
 * `lemmas` son todas las entradas de diccionario (sustantivos, adjetivos,
 * infinitivos…), que es justo lo que sí puede ser solución.
 */
function buildLemmaIndex(text) {
  /** @type {Map<string, Set<string>>} */
  const formToLemma = new Map()
  const lemmas = new Set()

  for (const line of text.split('\n')) {
    const [rawLemma, rawForm] = line.split('\t')
    if (!rawLemma || !rawForm) continue

    const lemma = normalize(rawLemma)
    const form = normalize(rawForm)
    if (!ONLY_LETTERS.test(lemma) || !ONLY_LETTERS.test(form)) continue

    lemmas.add(lemma)
    const set = formToLemma.get(form) ?? new Set()
    set.add(lemma)
    formToLemma.set(form, set)
  }

  return { formToLemma, lemmas }
}

/**
 * ¿La palabra es una forma verbal conjugada? Se descartan como solución porque
 * son casi imposibles de adivinar (CUNDA, ACUDA, ABRAN…). Se conservan las que
 * el diccionario tiene como entrada propia —muchas coinciden con un sustantivo,
 * como ABRIGO o ABRAZO— y los plurales normales.
 */
function isConjugated(word, { formToLemma, lemmas }, verbs) {
  if (lemmas.has(word)) return false

  for (const suffix of ['S', 'ES']) {
    const singular = word.slice(0, -suffix.length)
    if (word.endsWith(suffix) && lemmas.has(singular) && !verbs.has(singular)) return false
  }

  const wordLemmas = formToLemma.get(word)
  if (!wordLemmas || wordLemmas.size === 0) return false

  return [...wordLemmas].every((lemma) => verbs.has(lemma))
}

/** En inglés: descarta plurales y formas -ED / -ING, que hacen malas soluciones. */
function isInflectedEnglish(word, { formToLemma, lemmas }) {
  if (!/(S|ED|ING)$/.test(word)) return false
  if (lemmas.has(word)) return false

  const wordLemmas = formToLemma.get(word)

  return Boolean(wordLemmas && [...wordLemmas].every((lemma) => lemma !== word))
}

function buildNameFilter(names) {
  const allowed = new Set(ALLOWED_NAMES)

  return new Set(
    names.map(normalize).filter((name) => ONLY_LETTERS.test(name) && !allowed.has(name))
  )
}

async function writeList(name, list) {
  const sorted = [...new Set(list)].sort()
  await writeFile(resolve(OUT_DIR, name), sorted.join('\n') + '\n', 'utf8')
  console.log(`  ${name.padEnd(22)} ${String(sorted.length).padStart(6)} palabras`)
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  console.log('Descargando fuentes…')
  const [
    esDict,
    enDict,
    esAff,
    esDic,
    enAff,
    enDic,
    esFreqText,
    enFreqText,
    esLemmaText,
    enLemmaText,
    esVerbText,
    enAnswersText,
    enValidText,
    esMaleText,
    esFemaleText,
    enNamesText,
  ] = await Promise.all([
    fetchJsonWords(SOURCES.esDict),
    fetchJsonWords(SOURCES.enDict),
    fetchText(SOURCES.esAff),
    fetchText(SOURCES.esDic),
    fetchText(SOURCES.enAff),
    fetchText(SOURCES.enDic),
    fetchText(SOURCES.esFreq),
    fetchText(SOURCES.enFreq),
    fetchText(SOURCES.esLemmas),
    fetchText(SOURCES.enLemmas),
    fetchText(SOURCES.esVerbs),
    fetchText(SOURCES.enWordleAnswers),
    fetchText(SOURCES.enWordleValid),
    fetchText(SOURCES.esNamesMale),
    fetchText(SOURCES.esNamesFemale),
    fetchText(SOURCES.enNames),
  ])

  console.log('Preparando índices…')
  const spellEs = nspell(esAff, esDic)
  const spellEn = nspell(enAff, enDic)

  const esLemmaIndex = buildLemmaIndex(esLemmaText)
  const enLemmaIndex = buildLemmaIndex(enLemmaText)
  const esVerbs = new Set(esVerbText.split('\n').map(normalize).filter(Boolean))

  const csvNames = (text) =>
    text
      .split('\n')
      .slice(1, NAME_LIMIT + 1)
      .map((line) => line.split(',')[0]?.trim() ?? '')
  const esNames = buildNameFilter([...csvNames(esMaleText), ...csvNames(esFemaleText)])
  const enNames = buildNameFilter(enNamesText.split('\n').map((line) => line.trim()))

  /** Palabras válidas por longitud, ya filtradas por el diccionario hunspell. */
  const validByLength = (list, spell, extra = []) => {
    /** @type {Map<number, Set<string>>} */
    const map = new Map(LENGTHS.map((length) => [length, new Set()]))

    for (const raw of [...list, ...extra]) {
      const word = normalize(raw)
      if (!ONLY_LETTERS.test(word)) continue

      const bucket = map.get(word.length)
      if (!bucket || bucket.has(word)) continue
      if (!extra.includes(word) && !existsInDictionary(spell, raw, word)) continue

      bucket.add(word)
    }

    return map
  }

  const esValid = validByLength(esDict, spellEs, EXTRA_ES)
  const enValid = validByLength(enDict, spellEn)

  const esFreq = frequencyOrder(esFreqText)
  const enFreq = frequencyOrder(enFreqText)

  const stripComments = (text) =>
    text
      .split('\n')
      .map((line) => normalize(line.trim()))
      .filter((line) => ONLY_LETTERS.test(line))

  const isBlocked = (word, names, extraBlocked = []) =>
    names.has(word) ||
    BLOCKED_PLACES.includes(word) ||
    extraBlocked.includes(word) ||
    BLOCKED_FORMS.includes(word) ||
    BLOCKED_EXTRA.includes(word) ||
    BLOCKED_ROOTS.some((root) => word.startsWith(root))

  console.log('\nEscribiendo listas…')

  for (const length of LENGTHS) {
    // --- Español ---------------------------------------------------------
    const esWords = esValid.get(length) ?? new Set()
    const esAnswers = []

    for (const raw of esFreq) {
      if (esAnswers.length >= MAX_ANSWERS) break

      const word = normalize(raw)
      if (word.length !== length || !esWords.has(word)) continue
      if (isBlocked(word, esNames, BLOCKED_SPAIN)) continue
      if (isConjugated(word, esLemmaIndex, esVerbs)) continue

      esAnswers.push(word)
    }

    await writeList(`es-${length}-valid.txt`, [...esWords, ...esAnswers])
    await writeList(`es-${length}-answers.txt`, esAnswers)

    // --- Inglés ----------------------------------------------------------
    const enWords = new Set(enValid.get(length) ?? [])
    let enAnswers = []

    if (length === 5) {
      // El inglés de 5 letras usa la lista oficial del Wordle del NYT.
      for (const word of stripComments(enValidText)) {
        if (word.length === 5) enWords.add(word)
      }

      enAnswers = stripComments(enAnswersText).filter(
        (word) => word.length === 5 && !BLOCKED_ROOTS.some((root) => word.startsWith(root))
      )
    } else {
      for (const raw of enFreq) {
        if (enAnswers.length >= MAX_ANSWERS) break

        const word = normalize(raw)
        if (word.length !== length || !enWords.has(word)) continue
        if (isBlocked(word, enNames)) continue
        if (isInflectedEnglish(word, enLemmaIndex)) continue

        enAnswers.push(word)
      }
    }

    for (const word of enAnswers) enWords.add(word)

    await writeList(`en-${length}-valid.txt`, [...enWords])
    await writeList(`en-${length}-answers.txt`, enAnswers)
  }

  console.log(`\nListo. Archivos en ${OUT_DIR}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
