import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"

import type { NextConfig } from "next"

const repoRoot = fileURLToPath(new URL("../..", import.meta.url))
// Local development shares one .env at the repo root; deployments set real env vars.
if (existsSync(`${repoRoot}.env`)) process.loadEnvFile(`${repoRoot}.env`)

const config: NextConfig = {
  transpilePackages: ["@sanitation/api", "@sanitation/core", "@sanitation/db", "@sanitation/ui"],
  turbopack: { root: repoRoot },
}

export default config
