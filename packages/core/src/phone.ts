import { DomainError } from "./errors"

/**
 * Normalises a Georgian mobile number (9 digits starting with 5) to E.164.
 * Other countries are rejected: sender.ge only delivers in Georgia.
 */
export function normalizePhone(input: string): string {
  const trimmed = input.trim()
  let digits = trimmed.replace(/\D/g, "")
  if (trimmed.startsWith("00")) digits = digits.slice(2)
  if (trimmed.startsWith("+") || trimmed.startsWith("00") || digits.length === 12) {
    if (!digits.startsWith("995")) throw new DomainError("INVALID_PHONE")
    digits = digits.slice(3)
  }
  if (!/^5\d{8}$/.test(digits)) throw new DomainError("INVALID_PHONE")
  return `+995${digits}`
}

/** "+995 555 12 34 56" */
export function formatPhone(phone: string): string {
  const n = phone.replace(/^\+995/, "")
  return `+995 ${n.slice(0, 3)} ${n.slice(3, 5)} ${n.slice(5, 7)} ${n.slice(7)}`
}

/** "+995 5•• ••• 456" */
export function maskPhone(phone: string): string {
  const n = phone.replace(/^\+995/, "")
  return `+995 ${n.slice(0, 1)}•• ••• ${n.slice(-3)}`
}
