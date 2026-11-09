import type { ReactNode } from "react"

import { Nav } from "@/components/nav"
import { requireAdmin } from "@/server/caller"

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const caller = await requireAdmin()
  const pendingRequests = await caller.callbackRequests.pendingCount()
  return (
    <div className="flex min-h-dvh">
      <Nav pendingRequests={pendingRequests} />
      <main className="mx-auto w-full max-w-2xl min-w-0 px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))] md:py-8">
        {children}
      </main>
    </div>
  )
}
