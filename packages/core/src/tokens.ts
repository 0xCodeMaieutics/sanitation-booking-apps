import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto"

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

/** A random URL-safe token and the hash we store instead of it. */
export function createToken(bytes = 16): { token: string; hash: string } {
  const token = randomBytes(bytes).toString("base64url")
  return { token, hash: sha256(token) }
}

export function createVerificationCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0")
}

export function hashVerificationCode(phone: string, code: string): string {
  return sha256(`${phone}:${code}`)
}

export function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, "hex")
  const bb = Buffer.from(b, "hex")
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}
