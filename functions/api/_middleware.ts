/**
 * Red de seguridad de toda la API.
 *
 * Si un handler lanza una excepción, Pages responde un 500 en texto plano y el
 * cliente solo puede decir "No se pudo completar la operación". Aquí se atrapa
 * y se devuelve el JSON de siempre, con el detalle en el log de Cloudflare.
 */

import { fail } from '../_lib/http'

interface MiddlewareContext {
  request: Request
  next(): Promise<Response>
}

export const onRequest = async ({ request, next }: MiddlewareContext): Promise<Response> => {
  try {
    return await next()
  } catch (error) {
    console.error(`[api] ${request.method} ${new URL(request.url).pathname}`, error)

    const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    const missingTable = /no such table/i.test(detail)

    return fail(
      500,
      missingTable ? 'db_not_ready' : 'server_error',
      missingTable
        ? 'La base de datos no está lista: falta correr npm run db:schema.'
        : `Error del servidor (${detail}).`
    )
  }
}
