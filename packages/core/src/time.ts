import { TZDate } from "@date-fns/tz"

const TIME_ZONE = "Asia/Tbilisi"

/** A Tbilisi calendar date, `YYYY-MM-DD`. */
export type LocalDate = string

/** 1 = Monday … 7 = Sunday. */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

const LOCAL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

function parseLocalDate(date: LocalDate): [number, number, number] {
  const match = LOCAL_DATE.exec(date)
  if (match === null) throw new Error(`Invalid local date: ${date}`)
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

export function isLocalDate(value: string): boolean {
  return LOCAL_DATE.test(value)
}

/** The instant of `hour` o'clock on `date`, Tbilisi time. */
export function localInstant(date: LocalDate, hour = 0): Date {
  const [y, m, d] = parseLocalDate(date)
  return new Date(new TZDate(y, m - 1, d, hour, 0, TIME_ZONE).getTime())
}

const pad = (n: number) => String(n).padStart(2, "0")

export function toLocalDate(instant: Date): LocalDate {
  const t = new TZDate(instant.getTime(), TIME_ZONE)
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`
}

/** The Tbilisi hour of an instant, 0–23. */
export function toLocalHour(instant: Date): number {
  return new TZDate(instant.getTime(), TIME_ZONE).getHours()
}

export function weekdayOf(date: LocalDate): IsoWeekday {
  const [y, m, d] = parseLocalDate(date)
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return (day === 0 ? 7 : day) as IsoWeekday
}

export function addDays(date: LocalDate, days: number): LocalDate {
  const [y, m, d] = parseLocalDate(date)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

export function addHours(instant: Date, hours: number): Date {
  return new Date(instant.getTime() + hours * 3_600_000)
}

/** Inclusive list of local dates from `from` to `to`. */
export function datesBetween(from: LocalDate, to: LocalDate): LocalDate[] {
  const dates: LocalDate[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) dates.push(d)
  return dates
}

export function formatHour(hour: number): string {
  return `${pad(hour)}:00`
}

// Chromium ships without Georgian ICU data, so `Intl` silently falls back to English there.
const MONTHS = [
  "იანვარი",
  "თებერვალი",
  "მარტი",
  "აპრილი",
  "მაისი",
  "ივნისი",
  "ივლისი",
  "აგვისტო",
  "სექტემბერი",
  "ოქტომბერი",
  "ნოემბერი",
  "დეკემბერი",
]
export const WEEKDAYS: Record<IsoWeekday, string> = {
  1: "ორშაბათი",
  2: "სამშაბათი",
  3: "ოთხშაბათი",
  4: "ხუთშაბათი",
  5: "პარასკევი",
  6: "შაბათი",
  7: "კვირა",
}
export const WEEKDAYS_SHORT: Record<IsoWeekday, string> = {
  1: "ორშ",
  2: "სამ",
  3: "ოთხ",
  4: "ხუთ",
  5: "პარ",
  6: "შაბ",
  7: "კვი",
}

export function dayOfMonth(date: LocalDate): number {
  return parseLocalDate(date)[2]
}

export function monthName(date: LocalDate): string {
  return MONTHS[parseLocalDate(date)[1] - 1] ?? ""
}

/** "ორშაბათი, 10 ნოემბერი" */
export function formatDate(date: LocalDate): string {
  return `${WEEKDAYS[weekdayOf(date)]}, ${dayOfMonth(date)} ${monthName(date)}`
}

/** "10 ნოემბერი, 14:00" */
export function formatDateTime(instant: Date): string {
  const date = toLocalDate(instant)
  return `${dayOfMonth(date)} ${monthName(date)}, ${formatHour(toLocalHour(instant))}`
}
