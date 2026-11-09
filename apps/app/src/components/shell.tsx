import { Logo } from "@sanitation/ui"
import Link from "next/link"
import type { ReactNode } from "react"

/** The page frame: a header naming whose app this is, and the page itself. */
export function Shell({ name, href, children }: { name: string; href: string; children: ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border bg-paper/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-2.5 px-4">
          <Link href={href} className="flex min-w-0 items-center gap-2.5 rounded-lg font-semibold text-ink">
            <Logo />
            <span className="truncate">{name}</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
    </>
  )
}
