import { describe, expect, it } from "vitest"

import { bookingLink, isValidSlug } from "./companies"

describe("isValidSlug", () => {
  it.each(["aleko-tbilisi", "abc", "sewer-24", "a".repeat(40)])("accepts %s", (slug) => {
    expect(isValidSlug(slug)).toBe(true)
  })

  it.each([
    ["too short", "ab"],
    ["too long", "a".repeat(41)],
    ["uppercase", "Aleko"],
    ["Georgian", "ალეკო"],
    ["a leading hyphen", "-aleko"],
    ["a trailing hyphen", "aleko-"],
    ["a double hyphen", "aleko--tbilisi"],
    ["a dot", "aleko.ge"],
    ["the Manage Link path", "b"],
    ["the API path", "api"],
    ["a reserved word", "admin"],
  ])("refuses %s", (_, slug) => {
    expect(isValidSlug(slug)).toBe(false)
  })
})

describe("bookingLink", () => {
  it("joins the app origin and slug", () => {
    expect(bookingLink("https://app.domain.ge/", "aleko-tbilisi")).toBe("https://app.domain.ge/aleko-tbilisi")
  })
})
