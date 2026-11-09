export interface SmsSender {
  send(to: string, body: string): Promise<void>
}

const consoleSmsSender: SmsSender = {
  async send(to, body) {
    console.info(`[sms] to ${to}: ${body}`)
  },
}

/**
 * Sender.ge (https://sender.ge/openapi.json). The sender name is the Brand Name
 * activated on the account, not something we send.
 */
export function senderGeSmsSender(apiKey: string): SmsSender {
  return {
    async send(to, body) {
      const destination = to.replace(/^\+995/, "")
      if (!/^5\d{8}$/.test(destination)) throw new Error("sender.ge only delivers to Georgian mobiles")
      // No retry: a timeout or 503 may still have been accepted, and a retry would send twice.
      const response = await fetch("https://sender.ge/api/send.php", {
        method: "POST",
        // smsno 2 is informational: no "SmsNo" opt-out suffix, unlike promotional (1).
        body: new URLSearchParams({ apikey: apiKey, smsno: "2", destination, content: body }),
        signal: AbortSignal.timeout(10_000),
      })
      const result = (await response.json().catch(() => null)) as {
        message?: string
        data?: { messageId?: string; qnt?: number }[]
      } | null
      if (!response.ok) {
        throw new Error(`sender.ge ${response.status}: ${result?.message ?? response.statusText}`)
      }
      const sent = result?.data?.[0]
      console.info(`[sms] sender.ge accepted ${sent?.messageId} (${sent?.qnt} segments)`)
    },
  }
}

/**
 * Picks the SMS provider from `SMS_PROVIDER`. Outside production every message is
 * logged to the console instead, even when a provider is configured.
 */
export function createSmsSender(provider = process.env.SMS_PROVIDER ?? ""): SmsSender {
  if (process.env.NODE_ENV !== "production") return consoleSmsSender
  if (provider === "") throw new Error("SMS_PROVIDER must be set in production")
  if (provider === "sender.ge") {
    const apiKey = process.env.SENDER_GE_API_KEY ?? ""
    if (apiKey === "") throw new Error("SENDER_GE_API_KEY must be set when SMS_PROVIDER is sender.ge")
    return senderGeSmsSender(apiKey)
  }
  throw new Error(`Unknown SMS_PROVIDER "${provider}". Add an SmsSender for it in packages/core/src/sms.ts.`)
}
