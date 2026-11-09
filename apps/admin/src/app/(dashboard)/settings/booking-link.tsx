"use client"

import { Button } from "@sanitation/ui"
import { CheckIcon, CopyIcon } from "lucide-react"
import { useState } from "react"

/** The Company's Booking Link, to share on its socials. */
export function BookingLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <section
      aria-labelledby="booking-link-heading"
      className="flex flex-col gap-3 rounded-2xl bg-paper p-4 ring-1 ring-border"
    >
      <div className="flex flex-col gap-1">
        <h2 id="booking-link-heading" className="text-base">
          დაჯავშნის ბმული
        </h2>
        <p className="text-sm text-ink-soft">გააზიარეთ სოციალურ ქსელებში — კლიენტები ამ ბმულით დაჯავშნიან.</p>
      </div>
      <div className="flex items-center gap-2">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="min-w-0 flex-1 truncate rounded-xl bg-mist px-3 py-2.5 font-medium text-brand"
        >
          {url}
        </a>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void navigator.clipboard.writeText(url).then(() => setCopied(true))
          }}
        >
          {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
          {copied ? "დაკოპირდა" : "კოპირება"}
        </Button>
      </div>
    </section>
  )
}
