import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'
import { sendBookingCancelled } from '@/lib/email/bookings'

const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Either party (the guest who booked, or the host of the boat) can cancel.
//  • A still-unpaid request (pending) releases the card hold.
//  • A confirmed/paid trip is marked cancelled and the date is freed — we do NOT auto-refund;
//    refunds are issued manually in the Stripe dashboard. Both sides + ops are notified.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: booking } = await admin
    .from('bookings')
    .select('id, status, renter_id, boat_id, start_datetime, stripe_payment_intent_id')
    .eq('id', id)
    .single()

  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: boatRow } = await admin
    .from('boats')
    .select('host_id')
    .eq('id', (booking as { boat_id: string }).boat_id)
    .single()
  const hostId = (boatRow as { host_id?: string } | null)?.host_id
  const isRenter = (booking as { renter_id: string }).renter_id === user.id
  const isHost = !!hostId && hostId === user.id
  if (!isRenter && !isHost) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const status = (booking as { status: string }).status
  const backTo = isHost ? '/host/bookings' : '/dashboard'
  // Already closed — nothing to do.
  if (status === 'cancelled' || status === 'completed') {
    return NextResponse.redirect(new URL(backTo, _req.url), 303)
  }

  // Release a still-uncaptured card hold (request-to-book). A 'cs_' checkout session expires on its own.
  const piId = (booking as { stripe_payment_intent_id: string | null }).stripe_payment_intent_id
  if (piId && piId.startsWith('pi_')) {
    try {
      const pi = await stripe.paymentIntents.retrieve(piId)
      const cancelable = ['requires_capture', 'requires_payment_method', 'requires_confirmation', 'requires_action']
      if (cancelable.includes(pi.status)) await stripe.paymentIntents.cancel(piId)
    } catch { /* ignore — proceed to mark cancelled */ }
  }
  // NOTE: a captured/confirmed payment is intentionally NOT auto-refunded — ops refunds in Stripe.

  await admin.from('bookings').update({ status: 'cancelled' }).eq('id', id)

  // Free the booked date so the boat is bookable again (mirrors the webhook's start-day booking).
  const date = (booking as { start_datetime: string }).start_datetime.split('T')[0]
  await admin
    .from('availability')
    .delete()
    .eq('boat_id', (booking as { boat_id: string }).boat_id)
    .eq('date', date)

  // Notify guest + host + ops. Flag a refund as owed when a confirmed (paid) trip was cancelled.
  try { await sendBookingCancelled(id, isHost ? 'host' : 'renter', status === 'confirmed') } catch { /* non-blocking */ }

  return NextResponse.redirect(new URL(backTo, _req.url), 303)
}
