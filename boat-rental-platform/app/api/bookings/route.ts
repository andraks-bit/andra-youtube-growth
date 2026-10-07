import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, createPaymentIntent } from '@/lib/stripe'
import { calcFees } from '@/lib/utils/pricing'
import { addHours, parseISO } from 'date-fns'
import type { BoatRow, BoatPricingRow, ProfileRow } from '@/types/database'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { boatId, pricingId, date, guests, time, occasion, notes } = await req.json()
    if (!boatId || !pricingId || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate time format HH:MM, default 09:00
    const safeTime = typeof time === 'string' && /^\d{2}:\d{2}$/.test(time) ? time : '09:00'

    // Fetch boat + pricing + host stripe account
    const { data: boatRaw } = await supabase
      .from('boats')
      .select('id, capacity_pax, status, instant_book, profiles(stripe_account_id, id)')
      .eq('id', boatId)
      .single()
    const boat = boatRaw as (Pick<BoatRow, 'id' | 'capacity_pax' | 'status' | 'instant_book'> & { profiles: Pick<ProfileRow, 'id' | 'stripe_account_id'> | null }) | null

    if (!boat || boat.status !== 'active') {
      return NextResponse.json({ error: 'Boat not available' }, { status: 400 })
    }

    const { data: pricingRaw } = await supabase
      .from('boat_pricing')
      .select('*')
      .eq('id', pricingId)
      .eq('boat_id', boatId)
      .single()
    const pricing = pricingRaw as BoatPricingRow | null

    if (!pricing) return NextResponse.json({ error: 'Pricing not found' }, { status: 400 })

    if (guests > boat.capacity_pax) {
      return NextResponse.json({ error: 'Too many guests' }, { status: 400 })
    }

    // Check date not already booked
    const { data: conflict } = await supabase
      .from('availability')
      .select('id')
      .eq('boat_id', boatId)
      .eq('date', date)
      .in('status', ['booked', 'blocked'])
      .maybeSingle()

    if (conflict) return NextResponse.json({ error: 'Date not available' }, { status: 409 })

    const fees = calcFees(pricing.price)
    const startDt = parseISO(`${date}T${safeTime}:00`)
    const endDt = pricing.duration_hours
      ? addHours(startDt, pricing.duration_hours)
      : addHours(startDt, 8)

    // Get or create Stripe customer for user
    const { data: profileRaw } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()
    const profile = profileRaw as Pick<ProfileRow, 'stripe_customer_id'> | null

    let customerId = profile?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email })
      customerId = customer.id
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId } as any)
        .eq('id', user.id)
    }

    const hostStripeAccountId = boat.profiles?.stripe_account_id

    // Combine occasion + free-form notes into a single special_requests string
    const specialRequests = [
      occasion ? `Occasion: ${occasion}` : null,
      typeof notes === 'string' && notes.trim() ? `Notes: ${notes.trim().slice(0, 500)}` : null,
    ].filter(Boolean).join('\n') || null

    // Create booking record
    const { data: bookingRaw, error: bookingErr } = await supabase
      .from('bookings')
      .insert({
        boat_id: boatId,
        renter_id: user.id,
        start_datetime: startDt.toISOString(),
        end_datetime: endDt.toISOString(),
        duration_hours: pricing.duration_hours,
        guests_count: guests,
        subtotal: fees.subtotal,
        service_fee: fees.serviceFee,
        total: fees.total,
        currency: pricing.currency ?? 'EUR',
        status: 'pending',
        special_requests: specialRequests,
      })
      .select('id')
      .single()
    const booking = bookingRaw as { id: string } | null

    if (bookingErr || !booking) {
      return NextResponse.json({ error: 'Could not create booking' }, { status: 500 })
    }

    // Request-to-book (Model C): if the boat is NOT instant-book, authorize a hold
    // now and only capture once the host approves. Instant-book charges immediately.
    const manualCapture = !boat.instant_book

    // Create Stripe PaymentIntent
    let clientSecret: string
    if (hostStripeAccountId) {
      const pi = await createPaymentIntent({
        amount: fees.total,
        currency: pricing.currency ?? 'EUR',
        connectedAccountId: hostStripeAccountId,
        bookingId: booking.id,
        customerId: customerId ?? undefined,
        manualCapture,
      })
      await supabase.from('bookings').update({ stripe_payment_intent_id: pi.id } as any).eq('id', booking.id)
      clientSecret = pi.client_secret!
    } else {
      const pi = await stripe.paymentIntents.create({
        amount: fees.total * 100,
        currency: (pricing.currency ?? 'EUR').toLowerCase(),
        metadata: { bookingId: booking.id },
        customer: customerId ?? undefined,
        ...(manualCapture ? { capture_method: 'manual' as const } : {}),
      })
      await supabase.from('bookings').update({ stripe_payment_intent_id: pi.id } as any).eq('id', booking.id)
      clientSecret = pi.client_secret!
    }

    return NextResponse.json({ clientSecret, bookingId: booking.id, requestToBook: manualCapture })
  } catch (err) {
    console.error('Booking creation error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
