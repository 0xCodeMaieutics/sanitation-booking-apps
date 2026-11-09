import { ChevronRightIcon, ClockIcon, PencilLineIcon } from "lucide-react"
import Link from "next/link"

import { formatDuration, formatPrice } from "@/lib/format"
import { serverCaller } from "@/server/caller"

export default async function ServicesPage() {
  const services = await (await serverCaller()).services()

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl">აირჩიეთ სერვისი</h1>
        <p className="text-ink-soft">შემდეგ აირჩევთ დღეს და დროს.</p>
      </div>

      <ul className="flex flex-col gap-3">
        {services.map((s) => (
          <li key={s.id}>
            <Link
              href={`/book/${s.id}`}
              className="flex min-h-20 items-center gap-3 rounded-2xl bg-paper p-4 ring-1 ring-border transition-colors duration-150 hover:ring-brand-soft focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:bg-mist"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-semibold">{s.name}</span>
                {s.description ? <span className="text-sm text-ink-soft">{s.description}</span> : null}
                <span className="flex items-center gap-3 text-sm text-ink-soft">
                  <span className="flex items-center gap-1">
                    <ClockIcon aria-hidden className="size-3.5" />
                    {formatDuration(s.durationHours)}
                  </span>
                  <span className="font-semibold text-ink">{formatPrice(s.priceGel)}</span>
                </span>
              </div>
              <ChevronRightIcon aria-hidden className="size-5 shrink-0 text-ink-soft" />
            </Link>
          </li>
        ))}
        <li>
          <Link
            href="/custom"
            className="flex min-h-20 items-center gap-3 rounded-2xl border-2 border-dashed border-input p-4 transition-colors duration-150 hover:border-brand-soft focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:bg-mist"
          >
            <PencilLineIcon aria-hidden className="size-6 shrink-0 text-brand" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="font-semibold">სხვა სამუშაო</span>
              <span className="text-sm text-ink-soft">
                აღწერეთ, რა გჭირდებათ — შეგითანხმებთ დროს და ფასს.
              </span>
            </div>
            <ChevronRightIcon aria-hidden className="size-5 shrink-0 text-ink-soft" />
          </Link>
        </li>
      </ul>
    </div>
  )
}
