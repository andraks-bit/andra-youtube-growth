import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { parseISO, addHours } from 'date-fns'
import { sendBookingModified } from '@/lib/email/bookings'

const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Guest changes the date / start time / duration of a booking that isn't locked in yet (pending).
// We update the trip and re-notify the host so they can approve the new slot. A confirmed/paid
// trip is intentionally NOT silently re-dated here — those change by messaging the host.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { date, time, hours } = await req.json().catch(() => ({} as { date?: string; time?: string; hours?: number }))
  if (!date) return NextResponse.json({ error: 'Pick a date' }, { status: 400 })

  const { data: booking } = await admin
    .from('bookings')
    .select('id, renter_id, status, duration_hours')
    .eq('id', id)
    .single()
  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if ((booking as { renter_id: string }).renter_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if ((booking as { status: string }).status !== 'pending') {
    return NextResponse.json({ error: 'This trip is already confirmed — message the host to change it.' }, { status: 400 })
  }

  const t = typeof time === 'string' && /^\d{2}:\d{2}$/.test(time) ? time : '09:00'
  const start = parseISO(`${String(date)}T${t}:00`)
  if (isNaN(start.getTime())) return NextResponse.json({ error: 'Invalid date or time' }, { status: 400 })
  const dur = Number(hours) > 0 ? Number(hours) : ((booking as { duration_hours: number | null }).duration_hours || 4)

  await admin.from('bookings').update({
    start_datetime: start.toISOString(),
    end_datetime: addHours(start, dur).toISOString(),
    duration_hours: dur,
  }).eq('id', id)

  try { await sendBookingModified(id) } catch { /* non-blocking */ }
  return NextResponse.json({ ok: true })
}
