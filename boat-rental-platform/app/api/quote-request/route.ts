import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { sendHostQuoteRequest, sendBookerQuoteReceived } from '@/lib/email/bookings'
import { parseISO, addHours } from 'date-fns'

const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

// A guest asks for a price on an unpriced boat. Works logged-in OR logged-out: a
// logged-out visitor supplies name+email and we find-or-create a passwordless
// account for them (so the enquiry has a renter_id and they can claim/track it
// later by signing in with that email) — no login wall, no card taken. We save
// the request (shows in My Trips), notify the owner (email + WhatsApp), and email
// the guest an immediate confirmation.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const body = await req.json()
    const { boatId, date, time, hours, guests, message } = body
    if (!boatId) return NextResponse.json({ error: 'Missing boat' }, { status: 400 })

    // Validate the boat FIRST so a bad request never creates an orphan guest account.
    const { data: boatRow } = await admin.from('boats').select('id, name, min_hours').eq('id', boatId).single()
    if (!boatRow) return NextResponse.json({ error: 'Boat not found' }, { status: 404 })
    const dur = Number(hours) > 0 ? Number(hours) : ((boatRow as { min_hours: number | null }).min_hours || 4)

    // Resolve the renter: the authed user, or a find-or-create guest account.
    let renterId: string
    let renterName: string
    let renterEmail: string | undefined
    let renterPhone: string | undefined
    if (user) {
      const meta = (user.user_metadata as Record<string, unknown>) || {}
      renterId = user.id
      renterName = (meta.full_name as string) || user.email?.split('@')[0] || 'Guest'
      renterEmail = user.email || undefined
      renterPhone = (meta.phone as string) || undefined
    } else {
      const name = String(body.name || '').trim()
      const email = String(body.email || '').trim().toLowerCase()
      const phone = String(body.phone || '').trim() || undefined
      if (!name || !EMAIL_RE.test(email)) {
        return NextResponse.json({ error: 'Your name and a valid email are required.' }, { status: 400 })
      }
      // generateLink creates the account if new (or returns the existing one) and
      // gives us its id — passwordless, no email sent here. We only send our own
      // transactional confirmation below, never an unsolicited login link.
      const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { data: { full_name: name, ...(phone ? { phone } : {}) } },
      })
      if (linkErr || !link?.user?.id) {
        return NextResponse.json({ error: 'Could not create your request — please try again.' }, { status: 500 })
      }
      renterId = link.user.id
      renterName = name
      renterEmail = email
      renterPhone = phone
    }

    const t = typeof time === 'string' && /^\d{2}:\d{2}$/.test(time) ? time : '09:00'
    let start = new Date()
    if (date) { try { const p = parseISO(`${String(date)}T${t}:00`); if (!isNaN(p.getTime())) start = p } catch { /* keep now */ } }

    const note = 'Price on request — quote' + (message ? ` · ${String(message).slice(0, 800)}` : '')
    const { data: booking, error } = await admin.from('bookings').insert({
      boat_id: boatId,
      renter_id: renterId,
      start_datetime: start.toISOString(),
      end_datetime: addHours(start, dur).toISOString(),
      duration_hours: dur,
      guests_count: Number(guests) || 1,
      // CHECK constraints require subtotal/total > 0; these are placeholders — a quote
      // has no price. It's identified everywhere by the "Price on request" special_requests
      // marker (see isQuote helpers), so the €1 is never shown.
      subtotal: 1, service_fee: 0, total: 1, currency: 'EUR',
      status: 'pending',
      special_requests: note,
    }).select('id').single()
    if (error || !booking) return NextResponse.json({ error: 'Could not create request' }, { status: 500 })

    try {
      await sendHostQuoteRequest({
        boatId,
        name: renterName,
        email: renterEmail,
        phone: renterPhone,
        date: date ? String(date) : undefined,
        guests: Number(guests) || undefined,
        message: [`Preferred start ${t} · ${dur}h`, message ? String(message) : null].filter(Boolean).join(' — ').slice(0, 1000),
      })
      await sendBookerQuoteReceived((booking as { id: string }).id)
    } catch { /* best-effort notifications — never fail the request on these */ }

    return NextResponse.json({ ok: true, bookingId: (booking as { id: string }).id })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
