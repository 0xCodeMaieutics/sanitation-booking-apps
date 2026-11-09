import { ArrowLeftIcon } from "lucide-react"
import Link from "next/link"

/** A step's title, its place in the flow, and a way back. */
export function StepHeader({
  title,
  step,
  of,
  onBack,
  backHref,
}: {
  title: string
  step: number
  of: number
  onBack?: () => void
  backHref?: string
}) {
  const backClass =
    "-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-mist focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
  return (
    <div className="flex items-center gap-1">
      {onBack === undefined ? (
        <Link href={backHref ?? "/"} className={backClass} aria-label="უკან">
          <ArrowLeftIcon aria-hidden className="size-5" />
        </Link>
      ) : (
        <button type="button" onClick={onBack} className={backClass} aria-label="უკან">
          <ArrowLeftIcon aria-hidden className="size-5" />
        </button>
      )}
      <div className="flex min-w-0 flex-col">
        <span className="text-xs text-ink-soft">
          ნაბიჯი {step} / {of}
        </span>
        <h1 className="truncate text-xl">{title}</h1>
      </div>
    </div>
  )
}
