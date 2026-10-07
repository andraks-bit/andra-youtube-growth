export const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT ?? 15)

/**
 * Pricing model: the listed price IS the final price the customer pays.
 * The 15% platform commission is invisibly taken from that — the host
 * receives 85% of the listed price as their payout.
 *
 * Customer sees: `total` only.
 * Backend records: `serviceFee` (our cut) + `hostPayout` (what the host gets).
 */
export function calcFees(listedPrice: number) {
  const total = listedPrice
  const serviceFee = Math.round(listedPrice * (PLATFORM_FEE_PERCENT / 100))
  const hostPayout = listedPrice - serviceFee
  // `subtotal` is kept equal to `total` for backward compatibility with UI
  // that referenced `fees.subtotal` — the line is no longer shown separately.
  return { subtotal: total, serviceFee, total, hostPayout }
}

export function formatPrice(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function durationLabel(hours: number) {
  if (hours < 24) return `${hours}h`
  const days = Math.round(hours / 24)
  return days === 1 ? '1 day' : `${days} days`
}
