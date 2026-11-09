import { Skeleton } from "@sanitation/ui"

export default function Loading() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="იტვირთება">
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="mt-2 h-5 w-1/3" />
      <Skeleton className="h-20 rounded-2xl" />
      <Skeleton className="h-20 rounded-2xl" />
      <Skeleton className="mt-2 h-5 w-1/3" />
      <Skeleton className="h-20 rounded-2xl" />
    </div>
  )
}
