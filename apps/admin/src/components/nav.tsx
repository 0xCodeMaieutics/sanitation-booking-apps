"use client"

import { Logo, cn } from "@sanitation/ui"
import { CalendarCheckIcon, CalendarOffIcon, PhoneCallIcon, SettingsIcon, WrenchIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const links = [
  { href: "/", label: "ჯავშნები", icon: CalendarCheckIcon },
  { href: "/requests", label: "მოთხოვნები", icon: PhoneCallIcon },
  { href: "/services", label: "სერვისები", icon: WrenchIcon },
  { href: "/time-off", label: "არასამუშაო", icon: CalendarOffIcon },
  { href: "/settings", label: "პარამეტრები", icon: SettingsIcon },
]

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" || pathname.startsWith("/bookings") : pathname.startsWith(href)
}

/** A sidebar on wide screens and a bottom tab bar on phones. */
export function Nav({ pendingRequests }: { pendingRequests: number }) {
  const pathname = usePathname()
  return (
    <>
      <aside className="hidden w-60 shrink-0 flex-col gap-6 border-r border-border bg-paper px-3 py-6 md:flex">
        <div className="flex items-center gap-2.5 px-3 font-semibold">
          <Logo />
          ადმინისტრირება
        </div>
        <nav className="flex flex-col gap-1" aria-label="მთავარი">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(pathname, l.href) ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors duration-150",
                isActive(pathname, l.href)
                  ? "bg-mist font-semibold text-ink"
                  : "text-ink-soft hover:bg-mist/60 hover:text-ink"
              )}
            >
              <l.icon aria-hidden className="size-5 shrink-0" />
              <span className="flex-1">{l.label}</span>
              {l.href === "/requests" && pendingRequests > 0 ? (
                <span className="rounded-full bg-cta px-2 text-xs font-semibold text-cta-foreground">
                  {pendingRequests}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
      </aside>

      <nav
        aria-label="მთავარი"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-5">
          {links.map((l) => {
            const active = isActive(pathname, l.href)
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] transition-colors duration-150",
                    active ? "font-semibold text-brand" : "text-ink-soft"
                  )}
                >
                  <l.icon aria-hidden className="size-6" />
                  <span className="max-w-full truncate px-1">{l.label}</span>
                  {l.href === "/requests" && pendingRequests > 0 ? (
                    <span className="absolute top-1.5 left-1/2 ml-2 min-w-5 rounded-full bg-cta px-1.5 text-center text-[11px] font-semibold text-cta-foreground">
                      {pendingRequests}
                    </span>
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
