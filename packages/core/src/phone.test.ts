import { describe, expect, it } from "vitest"

import { DomainError } from "./errors"
import { formatPhone, normalizePhone } from "./phone"

describe("normalizePhone", () => {
  it.each(["555123456", "555 12 34 56", "+995 555 12 34 56", "00995555123456", "995555123456"])(
    "reads %s as a Georgian mobile",
    (input) => {
      expect(normalizePhone(input)).toBe("+995555123456")
    }
  )

  it.each(["322123456", "+49 151 1234567", "55512345"])("rejects %s", (input) => {
    expect(() => normalizePhone(input)).toThrow(DomainError)
  })
})

describe("formatPhone", () => {
  it("groups the digits", () => {
    expect(formatPhone("+995555123456")).toBe("+995 555 12 34 56")
  })
})
