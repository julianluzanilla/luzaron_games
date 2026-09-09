/**
 * Tipos mínimos del entorno de Cloudflare.
 *
 * Se declaran a mano en vez de instalar `@cloudflare/workers-types` para no
 * meter una dependencia de 2 MB por cinco interfaces. Si algún día el backend
 * crece, se cambia por el paquete oficial y se borra este archivo.
 */

export interface D1Result<T = unknown> {
  results: T[]
  success: boolean
  meta: Record<string, unknown>
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = unknown>(): Promise<T | null>
  all<T = unknown>(): Promise<D1Result<T>>
  run(): Promise<D1Result>
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>
}

export interface Env {
  /** Binding de la base D1. Se configura en wrangler.toml y en el panel de Pages. */
  DB: D1Database
}

/** Lo que Pages Functions le pasa a cada handler. */
export interface PagesContext {
  request: Request
  env: Env
  params: Record<string, string | string[]>
  waitUntil(promise: Promise<unknown>): void
}

export type PagesFunction = (context: PagesContext) => Response | Promise<Response>
