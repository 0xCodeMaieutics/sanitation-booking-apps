import { Shell } from "@/components/shell"

export default function NotFound() {
  return (
    <Shell name="Cleanly" href="/">
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-paper px-6 py-10 text-center">
        <h1 className="text-lg">გვერდი ვერ მოიძებნა</h1>
        <p className="text-ink-soft">
          შეამოწმეთ ბმული — შესაძლოა ის მოძველებულია ან არასწორად არის აკრეფილი.
        </p>
      </div>
    </Shell>
  )
}
