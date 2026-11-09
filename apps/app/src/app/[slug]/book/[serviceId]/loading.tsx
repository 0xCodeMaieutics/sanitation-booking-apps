import { Skeleton } from "@sanitation/ui"

export default function Loading() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="იტვირთება">
      <Skeleton className="h-10 w-2/3" />
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-20 w-16 shrink-0 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-6 w-1/2" />
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 9 }, (_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    </div>
  )
}
