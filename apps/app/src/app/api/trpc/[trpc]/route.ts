import { appRouter } from "@sanitation/api/app"
import { fetchRequestHandler } from "@trpc/server/adapters/fetch"

import { createAppContext } from "@/server/context"

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createAppContext(req.headers),
    onError({ error, path }) {
      if (error.code === "INTERNAL_SERVER_ERROR") console.error(`tRPC ${path} failed`, error)
    },
  })
}

export { handler as GET, handler as POST }
