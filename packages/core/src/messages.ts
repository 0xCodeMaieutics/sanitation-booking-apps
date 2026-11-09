import { formatPhone } from "./phone"
import { formatDateTime } from "./time"

type BookingSummary = { title: string; startsAt: Date }

/**
 * Georgian SMS texts. Georgian is sent as UCS-2, so each segment holds 70 characters.
 * Every SMS comes from Cleanly's sender name, so all but the code say which Company sent it.
 */
export const clientMessages = {
  verificationCode: (code: string) => `თქვენი კოდი: ${code}`,
  confirmation: (companyName: string, b: BookingSummary, manageUrl: string) =>
    `${companyName}: ჯავშანი დადასტურდა: ${b.title}, ${formatDateTime(b.startsAt)}. ნახვა/გაუქმება: ${manageUrl}`,
  cancelledByAdmin: (companyName: string, b: BookingSummary) =>
    `${companyName}: თქვენი ჯავშანი (${b.title}, ${formatDateTime(b.startsAt)}) გაუქმდა. დეტალებისთვის დაგვიკავშირდით.`,
  requestDeclined: (companyName: string) =>
    `${companyName}: სამწუხაროდ, თქვენს მოთხოვნას ამჯერად ვერ შევასრულებთ.`,
}

export const adminAlerts = {
  newBooking: (b: BookingSummary & { clientName: string; phone: string }) =>
    `ახალი ჯავშანი: ${b.title}, ${formatDateTime(b.startsAt)}. ${b.clientName}, ${formatPhone(b.phone)}`,
  cancelledByClient: (b: BookingSummary & { clientName: string }) =>
    `ჯავშანი გაუქმდა: ${b.title}, ${formatDateTime(b.startsAt)}. ${b.clientName}`,
  customRequest: (r: { desiredStartsAt: Date; phone: string }) =>
    `ახალი მოთხოვნა (ინდივიდუალური): ${formatDateTime(r.desiredStartsAt)}. დღე შეჩერებულია. ${formatPhone(r.phone)}`,
  callbackRequest: (r: { phone: string }) => `გადარეკვის მოთხოვნა: ${formatPhone(r.phone)}`,
}
