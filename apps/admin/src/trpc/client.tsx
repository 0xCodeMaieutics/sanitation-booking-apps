"use client"

import type { AdminRouter } from "@sanitation/api/admin"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createTRPCClient, httpBatchLink } from "@trpc/client"
import { createTRPCContext } from "@trpc/tanstack-react-query"
import { type ReactNode, useState } from "react"
import superjson from "superjson"

const trpcContext = createTRPCContext<AdminRouter>()
const { TRPCProvider } = trpcContext
export const { useTRPC } = trpcContext

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  const [trpcClient] = useState(() =>
    createTRPCClient<AdminRouter>({
      links: [httpBatchLink({ url: "/api/trpc", transformer: superjson })],
    })
  )
  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  )
}
