/**
 * Test Companies, each set up for one booking situation. The seed rebuilds them on every run,
 * so `day` offsets (0 = today in Tbilisi) stay relative to the day you last seeded.
 */

/** A start hour `day` days from today; negative days are in the past. */
type At = { day: number; hour: number }

type ScenarioService = {
  name: string
  description: string
  durationHours: number
  priceGel: number
  archived?: boolean
}

export type ScenarioBooking = At & {
  /** Index into the scenario's Services, or a Custom Service. */
  service: number | { custom: string; durationHours: number }
  createdBy?: "client" | "admin"
}

export type ScenarioCallbackRequest = {
  /** Set for a Custom Service request: while Pending it pauses that day. Unset for one left on a Paused Day. */
  desired?: At
  /** The Paused Day it was left on, as a `day` offset. Unset for a Custom Service request. */
  pausedDay?: number
  description?: string
  /** Indexes of the Standard Services ticked on a Paused Day's form. */
  services?: number[]
  note?: string
  status?: "pending" | "declined" | { acceptedHours: number; priceGel: number }
}

export type Scenario = {
  slug: string
  name: string
  /** What the scenario is for, printed after seeding. */
  purpose: string
  adminPhone: string
  formerSlugs?: string[]
  suspended?: boolean
  minNoticeHours?: number
  workingDays?: number[]
  services?: ScenarioService[]
  bookings?: ScenarioBooking[]
  callbackRequests?: ScenarioCallbackRequest[]
  /** Without hours, the whole day. */
  timeOff?: { day: number; fromHour?: number; toHour?: number; note?: string }[]
}

const drain: ScenarioService = {
  name: "კანალიზაციის გაწმენდა",
  description: "ჩახერგილი მილის გახსნა",
  durationHours: 1,
  priceGel: 80,
}

/** 1, 2 and 3 hours long, so gaps can fit some Services but not others. */
export const SCENARIO_SERVICES: ScenarioService[] = [
  drain,
  { name: "სეპტიკის გაწმენდა", description: "ავზის ამოტუმბვა", durationHours: 2, priceGel: 200 },
  { name: "ჭის გაწმენდა", description: "ამოტუმბვა და გარეცხვა", durationHours: 3, priceGel: 250 },
]

/** Bookings occupying every start time of the day, 09:00 to 18:00. */
function fullDay(day: number): ScenarioBooking[] {
  return [
    { day, hour: 9, service: 1 },
    { day, hour: 11, service: 0 },
    { day, hour: 12, service: 2 },
    { day, hour: 15, service: 1 },
    { day, hour: 17, service: 0 },
    { day, hour: 18, service: 0, createdBy: "admin" },
  ]
}

/** One-hour gaps at 11:00 and 14:00. Longer Services can still start at 18:00, running past it. */
function shortGapsDay(day: number): ScenarioBooking[] {
  return [
    { day, hour: 9, service: 1 },
    { day, hour: 12, service: 1 },
    { day, hour: 15, service: 2 },
  ]
}

const days = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i)

export const scenarios: Scenario[] = [
  {
    slug: "test-empty",
    name: "ტესტი: ცარიელი",
    purpose: "No Bookings, Callback Requests or Time Off. /test-empty-old redirects here.",
    adminPhone: "+995555000001",
    formerSlugs: ["test-empty-old"],
  },
  {
    slug: "test-full-today",
    name: "ტესტი: დღეს სავსე",
    purpose: "Every start time today is booked; tomorrow is open.",
    adminPhone: "+995555000002",
    bookings: fullDay(0),
  },
  {
    slug: "test-full-2-days",
    name: "ტესტი: 2 დღე სავსე",
    purpose: "Every start time today and tomorrow is booked.",
    adminPhone: "+995555000003",
    bookings: [...fullDay(0), ...fullDay(1)],
  },
  {
    slug: "test-full-window",
    name: "ტესტი: 14 დღე სავსე",
    purpose: "Every day of the Booking Window is fully booked, so only the Custom Service is left.",
    adminPhone: "+995555000004",
    bookings: days(0, 14).flatMap(fullDay),
  },
  {
    slug: "test-paused-today",
    name: "ტესტი: დღეს შეჩერებული",
    purpose:
      "A Pending Custom Service request for 14:00 pauses today, and two Clients have left Paused Day requests.",
    adminPhone: "+995555000005",
    bookings: [
      { day: 1, hour: 10, service: 1 },
      { day: 1, hour: 14, service: 0 },
    ],
    callbackRequests: [
      { desired: { day: 0, hour: 14 }, description: "სარდაფში წყალი დგას, ტუმბო გვჭირდება" },
      { pausedDay: 0, services: [0, 1], note: "დილით მირჩევნია" },
      { pausedDay: 0, description: "ეზოში ძველი ჭა უნდა ამოივსოს" },
    ],
  },
  {
    slug: "test-paused-later",
    name: "ტესტი: შეჩერებული დღე",
    purpose:
      "Today is open; a Pending request pauses the day 3 days from now. Also one Accepted and one Declined request.",
    adminPhone: "+995555000006",
    callbackRequests: [
      { desired: { day: 3, hour: 11 }, description: "მილის შეცვლა აბაზანაში" },
      {
        desired: { day: 2, hour: 10 },
        description: "სარდაფის კანალიზაციის გადატანა",
        status: { acceptedHours: 4, priceGel: 450 },
      },
      { desired: { day: 1, hour: 16 }, description: "აუზის გაწმენდა", status: "declined" },
    ],
  },
  {
    slug: "test-short-gaps",
    name: "ტესტი: მოკლე ფანჯრები",
    purpose:
      "Today and tomorrow leave one-hour gaps at 11:00 and 14:00: only the 1-hour Service fits them. Longer ones can start at 18:00.",
    adminPhone: "+995555000007",
    bookings: [...shortGapsDay(0), ...shortGapsDay(1)],
  },
  {
    slug: "test-time-off",
    name: "ტესტი: არასამუშაო დრო",
    purpose: "Time Off from 13:00 today, all of tomorrow, and 09:00–12:00 the day after.",
    adminPhone: "+995555000008",
    timeOff: [
      { day: 0, fromHour: 13, toHour: 19, note: "ექიმთან" },
      { day: 1, note: "შვებულება" },
      { day: 2, fromHour: 9, toHour: 12 },
    ],
  },
  {
    slug: "test-weekdays",
    name: "ტესტი: სამუშაო დღეები",
    purpose: "Works Monday to Friday only, with 24 hours' Minimum Notice.",
    adminPhone: "+995555000009",
    workingDays: [1, 2, 3, 4, 5],
    minNoticeHours: 24,
  },
  {
    slug: "test-no-notice",
    name: "ტესტი: დღესვე",
    purpose: "Zero Minimum Notice: the next hour today can be booked.",
    adminPhone: "+995555000010",
    minNoticeHours: 0,
  },
  {
    slug: "test-double-booked",
    name: "ტესტი: გადაფარვა",
    purpose: "Admin Bookings overlap each other and a Client Booking at 10:00 today and tomorrow.",
    adminPhone: "+995555000011",
    bookings: days(0, 1).flatMap((day): ScenarioBooking[] => [
      { day, hour: 10, service: 1 },
      { day, hour: 10, service: 0, createdBy: "admin" },
      { day, hour: 11, service: 2, createdBy: "admin" },
    ]),
  },
  {
    slug: "test-suspended",
    name: "ტესტი: შეჩერებული კომპანია",
    purpose: "Suspended, with a Booking tomorrow the Client can still cancel at /b/test-suspended-1.",
    adminPhone: "+995555000012",
    suspended: true,
    bookings: [{ day: 1, hour: 10, service: 1 }],
  },
  {
    slug: "test-no-services",
    name: "ტესტი: სერვისების გარეშე",
    purpose: "Its only Standard Service is Archived, so Clients see just the Custom Service.",
    adminPhone: "+995555000013",
    services: [{ ...drain, archived: true }],
  },
]
