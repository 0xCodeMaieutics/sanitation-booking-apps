import { adminRouter } from "@sanitation/api/admin"
import { fetchRequestHandler } from "@trpc/server/adapters/fetch"

import { createAdminContext } from "@/server/context"

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: adminRouter,
    createContext: () => createAdminContext(req.headers),
    onError({ error, path }) {
      if (error.code === "INTERNAL_SERVER_ERROR") console.error(`tRPC ${path} failed`, error)
    },
  })
}

export { handler as GET, handler as POST }
