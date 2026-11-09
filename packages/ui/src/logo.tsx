import { cn } from "cn"

/** The droplet mark used in both apps' headers and as the customer app's favicon (admin's favicon uses an ink background). */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn("size-7 shrink-0", className)}>
      <rect width="64" height="64" rx="14" fill="#1e40af" />
      <path d="M32 12c-7 9.5-13 17-13 24a13 13 0 0 0 26 0c0-7-6-14.5-13-24z" fill="#ffffff" />
      <path d="M26 37a6 6 0 0 0 6 6" stroke="#1e40af" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  )
}
