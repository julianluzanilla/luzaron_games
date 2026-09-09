/** Respuestas JSON con la misma forma en toda la API. */

export function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // La API nunca se cachea: siempre habla de la sesión de quien pregunta.
      'Cache-Control': 'no-store',
      ...(init?.headers ?? {}),
    },
  })
}

/**
 * Error de la API. `error` es el código que lee el cliente y `message` el texto
 * que se le enseña al usuario, ya en español.
 */
export function fail(status: number, error: string, message: string): Response {
  return json({ error, message }, { status })
}

export const badRequest = (message: string): Response => fail(400, 'bad_request', message)
export const unauthorized = (): Response => fail(401, 'unauthorized', 'Necesitas iniciar sesión.')
export const forbidden = (): Response =>
  fail(403, 'forbidden', 'No tienes permiso para hacer esto.')
export const notFound = (): Response => fail(404, 'not_found', 'No se encontró.')

/** Lee el cuerpo JSON sin reventar si viene vacío o mal formado. */
export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T
  } catch {
    return null
  }
}

export function methodNotAllowed(): Response {
  return fail(405, 'method_not_allowed', 'Método no permitido.')
}
