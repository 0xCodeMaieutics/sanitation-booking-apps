import { Skeleton } from "@sanitation/ui"

export default function Loading() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="იტვირთება">
      <Skeleton className="h-7 w-2/3" />
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="mt-2 h-24" />
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
    </div>
  )
}
