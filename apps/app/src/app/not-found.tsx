import { Button } from "@sanitation/ui"
import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl bg-paper px-6 py-10 text-center">
      <h1 className="text-lg">გვერდი ვერ მოიძებნა</h1>
      <p className="text-ink-soft">შესაძლოა ბმული მოძველებულია.</p>
      <Button asChild>
        <Link href="/">მთავარზე დაბრუნება</Link>
      </Button>
    </div>
  )
}
