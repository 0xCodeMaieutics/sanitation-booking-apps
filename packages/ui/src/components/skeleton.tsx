import { cn } from "cn"
import * as React from "react"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn("animate-pulse rounded-xl bg-mist", className)}
      {...props}
    />
  )
}

export { Skeleton }
