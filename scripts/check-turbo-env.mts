import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

// Turbo runs `build` in strict env mode, so any variable an app validates at
// build time must be listed in turbo.json or it is stripped before `next build`.

const root = join(import.meta.dirname, "..")
const turbo = JSON.parse(readFileSync(join(root, "turbo.json"), "utf8"))
const allowed = new Set<string>([...(turbo.globalEnv ?? []), ...(turbo.tasks.build.env ?? [])])

const missing: string[] = []
for (const app of readdirSync(join(root, "apps"))) {
  const envFile = join("apps", app, "src", "env.ts")
  if (!existsSync(join(root, envFile))) continue
  const source = readFileSync(join(root, envFile), "utf8")
  for (const [, name] of source.matchAll(/^\s+(\w+): process\.env\.\1,?$/gm)) {
    if (name !== undefined && !allowed.has(name)) missing.push(`${envFile}: ${name}`)
  }
}

if (missing.length > 0) {
  console.error("These variables are validated at build time but missing from turbo.json tasks.build.env:")
  for (const entry of missing) console.error(`  ${entry}`)
  process.exit(1)
}
console.log("All build-time env variables are listed in turbo.json.")
