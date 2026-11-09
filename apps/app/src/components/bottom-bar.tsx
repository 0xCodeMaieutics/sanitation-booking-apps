import type { ReactNode } from "react"

/** The step's main action, pinned above the home indicator on phones. */
export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">{children}</div>
    </div>
  )
}
