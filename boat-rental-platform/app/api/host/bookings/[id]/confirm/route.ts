import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'
import { sendBookerPaymentLink } from '@/lib/email/bookings'

const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status, stripe_payment_intent_id, total, currency, duration_hours, boats(name, host_id)')
    .eq('id', id)
    .single()

  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if ((booking.boats as any)?.host_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (booking.status !== 'pending') {
    return NextResponse.json({ error: 'Booking is not pending' }, { status: 400 })
  }

  const piId = (booking as { stripe_payment_intent_id: string | null }).stripe_payment_intent_id

  if (piId && piId.startsWith('pi_')) {
    // Card-hold (instant / Model C): capture now → the webhook books the date + emails the guest.
    try {
      const pi = await stripe.paymentIntents.retrieve(piId)
      if (pi.status === 'requires_capture') await stripe.paymentIntents.capture(piId)
    } catch (e) {
      return NextResponse.json({ error: `Could not capture payment: ${(e as Error)?.message ?? 'Stripe error'}` }, { status: 500 })
    }
    await admin.from('bookings').update({ status: 'confirmed' }).eq('id', id)
  } else {
    // Request-first (no card yet): create a Stripe payment link and send it to the guest.
    // Booking stays pending until they pay; the webhook confirms it on payment success.
    try {
      const boatName = (booking.boats as { name?: string } | null)?.name ?? 'your charter'
      const dur = (booking as { duration_hours: number | null }).duration_hours
      const total = (booking as { total: number | null }).total ?? 0
      const currency = ((booking as { currency: string | null }).currency ?? 'EUR').toLowerCase()
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
        payment_intent_data: { metadata: { bookingId: id } },
        metadata: { bookingId: id },
        success_url: `https://boathire24.com/bookings/${id}?paid=1`,
        cancel_url: `https://boathire24.com/bookings/${id}`,
      })
      // Store the checkout-session id so the dashboard can show "awaiting payment".
      await admin.from('bookings').update({ stripe_payment_intent_id: session.id }).eq('id', id)
      await sendBookerPaymentLink(id, session.url!)
    } catch (e) {
      return NextResponse.json({ error: `Could not create payment link: ${(e as Error)?.message ?? 'Stripe error'}` }, { status: 500 })
    }
  }

  return NextResponse.redirect(new URL('/host/bookings', _req.url))
}
