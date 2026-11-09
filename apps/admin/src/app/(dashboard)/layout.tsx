import { PauseCircleIcon } from "lucide-react"
import type { ReactNode } from "react"

import { Nav } from "@/components/nav"
import { requireAdmin } from "@/server/caller"

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const caller = await requireAdmin()
  const [me, pendingRequests] = await Promise.all([caller.auth.me(), caller.callbackRequests.pendingCount()])
  return (
    <div className="flex min-h-dvh">
      <Nav companyName={me.companyName} pendingRequests={pendingRequests} />
      <main className="mx-auto w-full max-w-2xl min-w-0 px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))] md:py-8">
        {me.suspended ? (
          <div className="mb-5 flex items-start gap-3 rounded-2xl bg-warning-soft p-4 text-ink">
            <PauseCircleIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-warning" />
            <div className="flex flex-col gap-1">
              <p className="font-semibold">ანგარიში შეჩერებულია</p>
              <p className="text-sm">
                კლიენტები ვერ ჯავშნიან და ახალ ჯავშანს ვერ შექმნით. არსებული ჯავშნები ძალაშია. დაუკავშირდით
                Cleanly-ს.
              </p>
            </div>
          </div>
        ) : null}
        {children}
      </main>
    </div>
  )
}
