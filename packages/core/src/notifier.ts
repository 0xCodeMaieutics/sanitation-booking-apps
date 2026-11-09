import { DomainError } from "./errors"
import type { SmsSender } from "./sms"

export type Notifier = {
  /** Sends a Verification Code; fails loudly, since the Client cannot continue without it. */
  sendCode(phone: string, body: string): Promise<void>
  /** A Client Message. A failure is logged: the change it reports has already happened. */
  client(phone: string, body: string): Promise<void>
  /** An Admin Alert to each of `phones`. A failure is logged, like a Client Message. */
  admin(phones: readonly string[], body: string): Promise<void>
}

export function createNotifier(sms: SmsSender): Notifier {
  const quietly = async (to: string, body: string) => {
    try {
      await sms.send(to, body)
    } catch (error) {
      console.error(`SMS to ${to} failed`, error)
    }
  }
  return {
    async sendCode(phone, body) {
      try {
        await sms.send(phone, body)
      } catch (error) {
        console.error(`Verification SMS to ${phone} failed`, error)
        throw new DomainError("SMS_FAILED")
      }
    },
    client: quietly,
    admin: async (phones, body) => {
      await Promise.all(phones.map((phone) => quietly(phone, body)))
    },
  }
}
