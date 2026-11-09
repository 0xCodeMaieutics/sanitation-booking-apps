import type { Conflict } from "@sanitation/core"

const messages: Record<string, string> = {
  NOT_FOUND: "ვერ მოიძებნა.",
  INVALID_PHONE: "მობილურის ნომერი არასწორია.",
  INVALID_CODE: "კოდი არასწორია ან ვადაგასულია.",
  RATE_LIMITED: "ახალი კოდის გაგზავნა ცოტა ხანში შეგეძლებათ.",
  SMS_FAILED: "SMS ვერ გაიგზავნა. შეამოწმეთ sender.ge-ს ბალანსი.",
  NOT_ADMIN_PHONE: "ეს ნომერი ადმინისტრატორის ნომერი არ არის.",
  UNAUTHORIZED: "სესია ამოიწურა. შედით თავიდან.",
  OVERLAP: "ეს დრო გადაფარავს სხვა ჯავშანს ან არასამუშაო დროს.",
  INVALID_STATE: "ეს მოქმედება აღარ არის შესაძლებელი. განაახლეთ გვერდი.",
}

type ErrorData = { domainCode?: string | null; conflicts?: Conflict[] }

function dataOf(error: unknown): ErrorData | undefined {
  return (error as { data?: ErrorData } | null)?.data
}

export function domainCodeOf(error: unknown): string | null {
  return dataOf(error)?.domainCode ?? null
}

export function conflictsOf(error: unknown): Conflict[] {
  return dataOf(error)?.conflicts ?? []
}

export function errorMessage(error: unknown): string {
  const code = domainCodeOf(error)
  return (code !== null ? messages[code] : undefined) ?? "შეცდომა. სცადეთ თავიდან."
}
