import { describe, expect, it } from "vitest"

import { type Calendar, type Occupied, availableStartTimes, windowAvailability } from "./availability"
import { formatHour, localInstant, toLocalHour } from "./time"

// Tuesday 10 November 2026, 07:30 in Tbilisi.
const NOW = new Date("2026-11-10T03:30:00Z")
const TODAY = "2026-11-10"
const TOMORROW = "2026-11-11"

function calendar(overrides: Partial<Calendar> = {}): Calendar {
  return {
    now: NOW,
    minNoticeHours: 0,
    workingDays: [1, 2, 3, 4, 5, 6, 7],
    firstStartHour: 9,
    lastStartHour: 18,
    occupied: [],
    pausedDates: new Set(),
    ...overrides,
  }
}

const hours = (times: Date[]) => times.map((t) => formatHour(toLocalHour(t)))

function busy(date: string, from: number, to: number, kind: Occupied["kind"] = "booking"): Occupied {
  return { kind, startsAt: localInstant(date, from), endsAt: localInstant(date, to), label: "" }
}

describe("availableStartTimes", () => {
  it("offers every hour from 09:00 to 18:00", () => {
    expect(hours(availableStartTimes(calendar(), TOMORROW, 1))).toEqual([
      "09:00",
      "10:00",
      "11:00",
      "12:00",
      "13:00",
      "14:00",
      "15:00",
      "16:00",
      "17:00",
      "18:00",
    ])
  })

  it("follows the Company's Working Hours", () => {
    const times = availableStartTimes(calendar({ firstStartHour: 7, lastStartHour: 10 }), TOMORROW, 1)
    expect(hours(times)).toEqual(["07:00", "08:00", "09:00", "10:00"])
  })

  it("offers every hour of the day when working around the clock", () => {
    const times = availableStartTimes(calendar({ firstStartHour: 0, lastStartHour: 23 }), TOMORROW, 1)
    expect(times).toHaveLength(24)
    expect(hours(times)[0]).toBe("00:00")
    expect(hours(times)[23]).toBe("23:00")
  })

  it("keeps a late job's Duration clear into the next day", () => {
    const allDay = { firstStartHour: 0, lastStartHour: 23 }
    const times = availableStartTimes(calendar({ ...allDay, occupied: [busy(TOMORROW, 0, 1)] }), TODAY, 3)
    expect(hours(times)).not.toContain("22:00")
    expect(hours(times)).toContain("21:00")
  })

  it("lets a job run past the last start time", () => {
    expect(hours(availableStartTimes(calendar(), TOMORROW, 3))).toContain("18:00")
  })

  it("applies Minimum Notice to today", () => {
    const times = availableStartTimes(calendar({ minNoticeHours: 3 }), TODAY, 1)
    expect(hours(times)[0]).toBe("11:00")
  })

  it("allows same-day booking with zero Minimum Notice", () => {
    expect(hours(availableStartTimes(calendar(), TODAY, 1))[0]).toBe("09:00")
  })

  it("needs the whole Duration clear of another Booking", () => {
    const times = availableStartTimes(calendar({ occupied: [busy(TOMORROW, 12, 13)] }), TOMORROW, 3)
    expect(hours(times)).toEqual(["09:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"])
  })

  it("keeps a Duration clear of Time Off", () => {
    const times = availableStartTimes(
      calendar({ occupied: [busy(TOMORROW, 13, 15, "timeOff")] }),
      TOMORROW,
      2
    )
    expect(hours(times)).toEqual(["09:00", "10:00", "11:00", "15:00", "16:00", "17:00", "18:00"])
  })

  it("only needs the start hour clear for a Callback Request", () => {
    const times = availableStartTimes(calendar({ occupied: [busy(TOMORROW, 12, 13)] }), TOMORROW, null)
    expect(hours(times)).toContain("11:00")
    expect(hours(times)).not.toContain("12:00")
  })

  it("offers nothing on a Paused Day", () => {
    expect(availableStartTimes(calendar({ pausedDates: new Set([TOMORROW]) }), TOMORROW, 1)).toEqual([])
  })

  it("offers nothing outside the Working Days", () => {
    // 11 November 2026 is a Wednesday.
    expect(availableStartTimes(calendar({ workingDays: [1, 2] }), TOMORROW, 1)).toEqual([])
  })

  it("offers nothing past the Booking Window", () => {
    expect(availableStartTimes(calendar(), "2026-11-25", 1)).toEqual([])
    expect(availableStartTimes(calendar(), "2026-11-24", 1)).not.toEqual([])
  })
})

describe("windowAvailability", () => {
  it("covers today and the next 14 days, with each day's status", () => {
    const days = windowAvailability(calendar({ pausedDates: new Set([TOMORROW]), workingDays: [2, 3] }), 1)
    expect(days).toHaveLength(15)
    expect(days[0]?.status).toBe("open")
    expect(days[1]?.status).toBe("paused")
    expect(days[2]?.status).toBe("closed")
  })
})
