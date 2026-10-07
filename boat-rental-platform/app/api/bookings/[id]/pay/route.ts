import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, PLATFORM_FEE_PERCENT } from '@/lib/stripe'

// Guest pays for a request-first booking the host has accepted → fresh Stripe Checkout.
// Routes the charge to the host's connected account (minus the platform fee) when they're
// onboarded for payouts, so the money lands in their claimable Stripe balance. Falls back to
// a platform-only charge if the host hasn't set up payouts yet.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL(`/login?next=/bookings/${id}`, req.url))

  const { data: b } = await supabase
    .from('bookings')
    .select('id, status, renter_id, boat_id, total, currency, duration_hours, boats(name)')
    .eq('id', id)
    .single()

  if (!b || (b as { renter_id: string }).renter_id !== user.id) return NextResponse.redirect(new URL('/dashboard', req.url))
  if ((b as { status: string }).status !== 'pending') return NextResponse.redirect(new URL(`/bookings/${id}`, req.url))

  const boatName = (b.boats as { name?: string } | null)?.name ?? 'your charter'
  const dur = (b as { duration_hours: number | null }).duration_hours
  const total = (b as { total: number | null }).total ?? 0
  const currency = ((b as { currency: string | null }).currency ?? 'EUR').toLowerCase()

  // Look up the host's connected account so the charge can be routed to them.
  const { data: boatRow } = await supabase.from('boats').select('host_id').eq('id', (b as { boat_id: string }).boat_id).single()
  const hostId = (boatRow as { host_id?: string } | null)?.host_id
  let hostStripeAccountId: string | null = null
  if (hostId) {
    const { data: hp } = await supabase.from('profiles').select('stripe_account_id').eq('id', hostId).single()
    hostStripeAccountId = (hp as { stripe_account_id?: string | null } | null)?.stripe_account_id ?? null
  }
  const applicationFeeAmount = Math.round(total * (PLATFORM_FEE_PERCENT / 100) * 100) // cents

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      price_data: {
        currency,
        product_data: { name: `${boatName}${dur ? ` — ${dur}h charter` : ''}` },
        unit_amount: Math.round(total * 100),
      },
      quantity: 1,
    }],
    payment_intent_data: {
      metadata: { bookingId: id },
      ...(hostStripeAccountId
        ? { application_fee_amount: applicationFeeAmount, transfer_data: { destination: hostStripeAccountId } }
        : {}),
    },
    metadata: { bookingId: id },
    success_url: `https://boathire24.com/bookings/${id}?paid=1`,
    cancel_url: `https://boathire24.com/bookings/${id}`,
  })

  return NextResponse.redirect(session.url!, 303)
}
