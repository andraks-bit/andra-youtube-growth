import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { sendBookerDeclined } from '@/lib/email/bookings'

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
    .select('id, status, stripe_payment_intent_id, boats(host_id)')
    .eq('id', id)
    .single()

  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if ((booking.boats as any)?.host_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Decline = release the card hold (cancel the authorization). No charge.
  const piId = (booking as any).stripe_payment_intent_id as string | null
  if (piId) {
    try {
      const pi = await stripe.paymentIntents.retrieve(piId)
      const cancelable = ['requires_capture', 'requires_payment_method', 'requires_confirmation', 'requires_action']
      if (cancelable.includes(pi.status)) await stripe.paymentIntents.cancel(piId)
    } catch { /* ignore — proceed to mark declined */ }
  }

  await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id)
  await sendBookerDeclined(id)
  return NextResponse.redirect(new URL('/host/bookings', _req.url))
}
