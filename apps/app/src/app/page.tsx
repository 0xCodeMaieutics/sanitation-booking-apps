import { LinkIcon } from "lucide-react"

import { Shell } from "@/components/shell"

/** Cleanly's own page. Each Company's Clients arrive through its Booking Link instead. */
export default function CleanlyPage() {
  return (
    <Shell name="Cleanly" href="/">
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-paper px-6 py-10 text-center ring-1 ring-border">
        <LinkIcon aria-hidden className="size-10 text-brand" />
        <h1 className="text-xl">ონლაინ ჯავშანი სანიტარიული სერვისებისთვის</h1>
        <p className="text-ink-soft">
          დასაჯავშნად გახსენით თქვენი სერვისის ბმული — მას იპოვით მათ სოციალურ ქსელებში ან ვებგვერდზე.
        </p>
      </div>
    </Shell>
  )
}
