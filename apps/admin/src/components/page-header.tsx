import { ArrowLeftIcon } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

export function PageHeader({
  title,
  backHref,
  action,
  description,
}: {
  title: string
  backHref?: string
  action?: ReactNode
  description?: string
}) {
  return (
    <div className="mb-5 flex items-start gap-2">
      {backHref !== undefined ? (
        <Link
          href={backHref}
          aria-label="უკან"
          className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-mist focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <ArrowLeftIcon aria-hidden className="size-5" />
        </Link>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1.5">
        <h1 className="text-2xl">{title}</h1>
        {description !== undefined ? <p className="text-sm text-ink-soft">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}
