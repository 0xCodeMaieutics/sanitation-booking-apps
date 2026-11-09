// Drops every table, enum and the migration journal so `migrate` starts from scratch.
import { sql } from "drizzle-orm"

import { createDb } from "./index"

if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing to reset the database with NODE_ENV=production")
}

const db = createDb()
await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`)
await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`)
await db.execute(sql`CREATE SCHEMA public`)
await db.$client.end()
console.log("Database reset.")
