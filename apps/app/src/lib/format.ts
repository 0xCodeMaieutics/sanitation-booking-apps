export const BUSINESS_NAME = "სანიტარიული სერვისი"

export function formatPrice(priceGel: number): string {
  return `${priceGel} ₾`
}

export function formatDuration(hours: number): string {
  return `${hours} სთ`
}
