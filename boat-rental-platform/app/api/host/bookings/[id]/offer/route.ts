import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'
import { sendBookerOffer } from '@/lib/email/bookings'
import { parseISO, addHours } from 'date-fns'

const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Host prices a "price on request" quote: they pick the date/time/duration and a price, we set
// it on the booking, spin up a Stripe Checkout session (same as accepting a priced request), and
// email/WhatsApp the guest an "accept & pay" link. Booking stays pending until they pay; the
// webhook confirms it. Clearing the "Price on request" marker makes the real price show everywhere.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status, boats(name, host_id)')
    .eq('id', id)
    .single()
  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if ((booking.boats as { host_id?: string } | null)?.host_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (booking.status !== 'pending') {
    return NextResponse.redirect(new URL('/host/bookings', req.url))
  }

  const form = await req.formData()
  const price = Math.round(Number(form.get('price')))
  const date = String(form.get('date') || '').trim()
  const time = String(form.get('time') || '09:00').trim()
  const durationHours = Math.min(48, Math.max(1, Math.round(Number(form.get('duration')) || 4)))
  const message = String(form.get('message') || '').trim().slice(0, 800)

  if (!price || price <= 0 || !date) {
    return NextResponse.redirect(new URL(`/host/bookings/${id}/offer?error=1`, req.url))
  }
  let start: Date
  try { start = parseISO(`${date}T${time || '09:00'}:00`); if (isNaN(start.getTime())) throw new Error() }
  catch { return NextResponse.redirect(new URL(`/host/bookings/${id}/offer?error=1`, req.url)) }
  const end = addHours(start, durationHours)

  const boatName = (booking.boats as { name?: string } | null)?.name ?? 'your charter'
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: `${boatName} — ${durationHours}h charter` },
          unit_amount: price * 100,
        },
        quantity: 1,
      }],
      payment_intent_data: { metadata: { bookingId: id } },
      metadata: { bookingId: id },
      success_url: `https://boathire24.com/bookings/${id}?paid=1`,
      cancel_url: `https://boathire24.com/bookings/${id}`,
    })
    await admin.from('bookings').update({
      subtotal: price, service_fee: 0, total: price, currency: 'EUR',
      start_datetime: start.toISOString(), end_datetime: end.toISOString(), duration_hours: durationHours,
      special_requests: `Offer sent — quote${message ? ` · ${message}` : ''}`,
      stripe_payment_intent_id: session.id,
    }).eq('id', id)
    await sendBookerOffer(id, session.url!, message || undefined)
  } catch (e) {
    return NextResponse.json({ error: `Could not send offer: ${(e as Error)?.message ?? 'Stripe error'}` }, { status: 500 })
  }

  return NextResponse.redirect(new URL('/host/bookings', req.url))
}
