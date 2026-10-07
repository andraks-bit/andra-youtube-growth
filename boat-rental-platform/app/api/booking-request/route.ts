import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { calcFees } from '@/lib/utils/pricing'
import { sendHostBookingRequest, sendBookerRequestReceived } from '@/lib/email/bookings'
import { addHours, parseISO } from 'date-fns'

const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Request-first booking: notify the owner of a date+hours request. No payment yet.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { boatId, pricingId, date, time, guests } = await req.json()
  if (!boatId || !pricingId || !date) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data: boat } = await admin.from('boats').select('id, status').eq('id', boatId).single()
  if (!boat || (boat as { status: string }).status !== 'active') {
    return NextResponse.json({ error: 'Boat not available' }, { status: 400 })
  }
  const { data: pricing } = await admin.from('boat_pricing').select('price, duration_hours, currency').eq('id', pricingId).eq('boat_id', boatId).single()
  if (!pricing) return NextResponse.json({ error: 'Pricing not found' }, { status: 400 })
  const p = pricing as { price: number; duration_hours: number | null; currency: string | null }

  // Guest contact from their account/profile.
  let guestPhone: string | undefined
  try { const { data } = await admin.auth.admin.getUserById(user.id); guestPhone = (data.user?.user_metadata as { phone?: string } | undefined)?.phone } catch {}
  const guestName = (user.user_metadata as { full_name?: string } | undefined)?.full_name

  // Save the request as a pending booking (no card) so the guest sees it in My Trips
  // and the host sees it in their dashboard. Payment happens after the host confirms.
  const safeTime = typeof time === 'string' && /^\d{2}:\d{2}$/.test(time) ? time : '09:00'
  const startDt = parseISO(`${date}T${safeTime}:00`)
  const endDt = p.duration_hours ? addHours(startDt, p.duration_hours) : addHours(startDt, 8)
  const fees = calcFees(p.price)
  const { data: booking } = await admin.from('bookings').insert({
    boat_id: boatId,
    renter_id: user.id,
    start_datetime: startDt.toISOString(),
    end_datetime: endDt.toISOString(),
    duration_hours: p.duration_hours,
    guests_count: guests ? Number(guests) || 1 : 1,
    subtotal: fees.subtotal,
    service_fee: fees.serviceFee,
    total: fees.total,
    currency: p.currency ?? 'EUR',
    status: 'pending',
    special_requests: 'Request to book — pay after the host confirms',
  }).select('id').single()

  await sendHostBookingRequest({
    boatId,
    guestEmail: user.email ?? undefined,
    guestName,
    guestPhone,
    date: String(date),
    time: time ? String(time) : undefined,
    durationHours: p.duration_hours,
    guests: guests ? Number(guests) || undefined : undefined,
    total: fees.total,
    currency: p.currency ?? 'EUR',
  })

  if (booking) await sendBookerRequestReceived((booking as { id: string }).id)

  return NextResponse.json({ ok: true, bookingId: (booking as { id: string } | null)?.id })
}
