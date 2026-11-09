import { migrate } from "drizzle-orm/postgres-js/migrator"

import { createDb } from "./index"

const db = createDb()
await migrate(db, { migrationsFolder: new URL("../migrations", import.meta.url).pathname })
await db.$client.end()
console.log("Migrations applied.")
