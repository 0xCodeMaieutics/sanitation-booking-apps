import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as schema from "./schema"

export * from "drizzle-orm"
export { schema }

export function createDb(url = process.env.DATABASE_URL) {
  if (url === undefined || url === "") throw new Error("DATABASE_URL is not set")
  // `prepare: false` keeps us compatible with Neon's pooled (PgBouncer) endpoint.
  const client = postgres(url, { prepare: false, max: 5 })
  return drizzle({ client, schema, casing: "snake_case" })
}

export type Db = ReturnType<typeof createDb>
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0]
export type DbOrTx = Db | Tx

const globalForDb = globalThis as unknown as { sanitationDb?: { db: Db; schema: typeof schema } }

/**
 * A process-wide Db, reused across hot reloads in development. A Db made before the schema
 * changed would keep its stale column-name cache, so a reloaded schema gets a new one.
 */
export function getDb(): Db {
  const cached = globalForDb.sanitationDb
  if (cached?.schema === schema) return cached.db
  const db = createDb()
  globalForDb.sanitationDb = { db, schema }
  return db
}

const UNIQUE_VIOLATION = "23505"

export function isUniqueViolation(error: unknown, constraint: string): boolean {
  let current: unknown = error
  while (current !== null && typeof current === "object") {
    const e = current as { code?: string; constraint_name?: string; cause?: unknown }
    if (e.code === UNIQUE_VIOLATION && e.constraint_name === constraint) return true
    current = e.cause
  }
  return false
}
