const messages: Record<string, string> = {
  NOT_FOUND: "ვერ მოიძებნა. განაახლეთ გვერდი.",
  INVALID_PHONE: "შეიყვანეთ ქართული მობილურის ნომერი, მაგ. 555 12 34 56.",
  INVALID_CODE: "კოდი არასწორია ან ვადაგასულია.",
  RATE_LIMITED: "ახალი კოდის გაგზავნა ცოტა ხანში შეგეძლებათ.",
  SMS_FAILED: "SMS ვერ გაიგზავნა. სცადეთ თავიდან.",
  START_UNAVAILABLE: "ეს დრო უკვე დაკავებულია. აირჩიეთ სხვა.",
  DAY_PAUSED: "ეს დღე დროებით შეჩერებულია. აირჩიეთ სხვა დღე ან დატოვეთ ნომერი.",
  PENDING_REQUEST_EXISTS: "თქვენ უკვე გაქვთ მოთხოვნა, რომელსაც ჯერ არ უპასუხეს.",
  INVALID_STATE: "ეს მოქმედება აღარ არის შესაძლებელი.",
  CANCEL_TOO_LATE: "ჯავშნის გაუქმება დაწყების შემდეგ შეუძლებელია.",
  COMPANY_SUSPENDED: "ონლაინ ჯავშანი დროებით მიუწვდომელია.",
}

export function domainCodeOf(error: unknown): string | null {
  const data = (error as { data?: { domainCode?: string | null } } | null)?.data
  return data?.domainCode ?? null
}

export function errorMessage(error: unknown): string {
  const code = domainCodeOf(error)
  return (code !== null ? messages[code] : undefined) ?? "შეცდომა. სცადეთ თავიდან."
}
