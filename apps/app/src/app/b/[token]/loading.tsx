import { Skeleton } from "@sanitation/ui"

export default function Loading() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="იტვირთება">
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  )
}
