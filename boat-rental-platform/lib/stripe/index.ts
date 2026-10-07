import Stripe from 'stripe'

// Lazy singleton — only instantiated at runtime when a key is present,
// not during Next.js static build analysis.
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY environment variable is not set')
    _stripe = new Stripe(key, {
      apiVersion: '2026-04-22.dahlia' as any,
      typescript: true,
    })
  }
  return _stripe
}

// Keep `stripe` as a named export for backwards compatibility
// (Proxy forwards every property access to the lazy instance)
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as any)[prop]
  },
})

export const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT ?? 15)

export async function createPaymentIntent({
  amount,
  currency,
  connectedAccountId,
  bookingId,
  customerId,
  manualCapture,
}: {
  amount: number
  currency: string
  connectedAccountId: string
  bookingId: string
  customerId?: string
  // Request-to-book: authorize (hold) the card now, capture only when the host approves.
  manualCapture?: boolean
}) {
  const applicationFeeAmount = Math.round(amount * (PLATFORM_FEE_PERCENT / 100))
  return stripe.paymentIntents.create({
    amount: amount * 100, // cents
    currency: currency.toLowerCase(),
    application_fee_amount: applicationFeeAmount * 100,
    transfer_data: { destination: connectedAccountId },
    metadata: { bookingId },
    ...(manualCapture ? { capture_method: 'manual' as const } : {}),
    ...(customerId ? { customer: customerId } : {}),
  })
}

export async function createConnectAccountLink(accountId: string, origin: string) {
  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/host/onboarding?refresh=1`,
    return_url: `${origin}/host/onboarding?success=1`,
    type: 'account_onboarding',
  })
}

export async function createConnectAccount(email: string) {
  return stripe.accounts.create({
    type: 'express',
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  })
}

// One-time link into the host's own Stripe Express dashboard — where they see payouts and
// add / change their bank account. (Stripe stores the bank details, never our DB.)
export async function createExpressLoginLink(accountId: string) {
  return stripe.accounts.createLoginLink(accountId)
}

// Live balance for a connected account, in whole currency units. payoutsEnabled is false until
// the host finishes Stripe onboarding (or if the lookup fails) — callers gate the UI on it.
export async function getPayoutSummary(accountId: string): Promise<{
  payoutsEnabled: boolean
  available: number
  pending: number
  currency: string
}> {
  try {
    const acct = await stripe.accounts.retrieve(accountId)
    if (acct.payouts_enabled !== true) return { payoutsEnabled: false, available: 0, pending: 0, currency: 'EUR' }
    const bal = await stripe.balance.retrieve({}, { stripeAccount: accountId })
    const sum = (arr: { amount: number }[]) => arr.reduce((s, x) => s + x.amount, 0)
    const currency = (bal.available[0]?.currency ?? bal.pending[0]?.currency ?? 'eur').toUpperCase()
    return { payoutsEnabled: true, available: sum(bal.available) / 100, pending: sum(bal.pending) / 100, currency }
  } catch {
    return { payoutsEnabled: false, available: 0, pending: 0, currency: 'EUR' }
  }
}
