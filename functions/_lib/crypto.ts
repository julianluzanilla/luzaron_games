/**
 * Contraseñas y tokens de sesión.
 *
 * Todo con WebCrypto, que es lo que hay en el runtime de Workers: no se
 * instala bcrypt ni argon2 porque son módulos nativos que ahí no corren.
 *
 * Las contraseñas de esta app son simples a propósito (4+ caracteres, letras y
 * números, PRODUCT_SPEC §5): son para que un niño pueda entrar solo. Por eso el
 * hash importa MÁS, no menos: una contraseña corta se rompe por fuerza bruta en
 * segundos si el hash es débil. PBKDF2 con 210 000 vueltas (recomendación OWASP
 * 2023 para SHA-256) hace que probarlas cueste.
 */

const ITERATIONS = 210_000
const KEY_BITS = 256
const SALT_BYTES = 16

const encoder = new TextEncoder()

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

async function derive(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])

  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: ITERATIONS, hash: 'SHA-256' },
    key,
    KEY_BITS
  )

  return new Uint8Array(bits)
}

/** Formato guardado: `pbkdf2$sha256$<vueltas>$<salt b64>$<hash b64>`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const hash = await derive(password, salt)

  return `pbkdf2$sha256$${ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`
}

/** Comparación en tiempo constante: no revela cuántos bytes coincidieron. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false

  let diff = 0
  for (let index = 0; index < a.length; index += 1) diff |= a[index] ^ b[index]

  return diff === 0
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')

  if (parts.length !== 5 || parts[0] !== 'pbkdf2') return false

  const iterations = Number(parts[2])
  if (!Number.isFinite(iterations) || iterations <= 0) return false

  const salt = fromBase64(parts[3])
  const expected = fromBase64(parts[4])

  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])

  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    key,
    expected.length * 8
  )

  return timingSafeEqual(new Uint8Array(bits), expected)
}

/* ---------------------------------------------------------------------- */
/* Tokens                                                                  */
/* ---------------------------------------------------------------------- */

function toBase64Url(bytes: Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Token de sesión: 32 bytes de azar. Es lo que viaja en la cookie. */
export function newSessionToken(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(32)))
}

/**
 * Lo que se guarda en la base NO es el token sino su SHA-256: si alguien lee la
 * tabla `sessions` no puede hacerse pasar por nadie.
 */
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(token))

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Id corto y ordenable por tiempo, para usuarios y records. */
export function newId(prefix: string): string {
  const random = toBase64Url(crypto.getRandomValues(new Uint8Array(9)))

  return `${prefix}_${Date.now().toString(36)}${random}`
}
