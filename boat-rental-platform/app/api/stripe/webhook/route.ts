import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { sendHostNewRequest, sendBookerConfirmed, sendHostBookingConfirmed } from '@/lib/email/bookings'
import type Stripe from 'stripe'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature error:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  switch (event.type) {
    // Request-to-book: the guest authorized a hold → ask the host to approve.
    case 'payment_intent.amount_capturable_updated': {
      const pi = event.data.object as Stripe.PaymentIntent
      const bookingId = pi.metadata?.bookingId
      if (!bookingId) break
      await sendHostNewRequest(bookingId)
      break
    }

    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent
      const bookingId = pi.metadata?.bookingId
      if (!bookingId) break

      await supabase.from('bookings').update({ status: 'confirmed' } as any).eq('id', bookingId)

      const { data: bookingRaw } = await supabase
        .from('bookings')
        .select('boat_id, start_datetime')
        .eq('id', bookingId)
        .single()
      const booking = bookingRaw as { boat_id: string; start_datetime: string } | null

      if (booking) {
        const date = booking.start_datetime.split('T')[0]
        await supabase.from('availability').upsert([{
          boat_id: booking.boat_id,
          date,
          status: 'booked',
        }] as any)
      }
      // Confirmed (host captured, instant book, or paid offer) → notify guest, host, and ops.
      await sendBookerConfirmed(bookingId)
      await sendHostBookingConfirmed(bookingId)
      break
    }

    case 'payment_intent.payment_failed':
    case 'payment_intent.canceled': {
      const pi = event.data.object as Stripe.PaymentIntent
      const bookingId = pi.metadata?.bookingId
      if (!bookingId) break
      await supabase.from('bookings').update({ status: 'cancelled' } as any).eq('id', bookingId)
      break
    }

    case 'account.updated': {
      const account = event.data.object as Stripe.Account
      if (account.charges_enabled && account.payouts_enabled) {
        await supabase
          .from('profiles')
          .update({ host_since: new Date().toISOString() } as any)
          .eq('stripe_account_id', account.id)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
