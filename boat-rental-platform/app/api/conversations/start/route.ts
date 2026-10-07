import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// "Message" button on a booking → get-or-create the host↔guest conversation for that booking,
// then drop the user into the chat. Either party (host or renter) can open it. Separate queries
// (not a nested join) keep the Supabase types clean.
export async function GET(req: NextRequest) {
  const bookingId = req.nextUrl.searchParams.get('booking')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL(`/login?next=/dashboard/messages`, req.url))
  if (!bookingId) return NextResponse.redirect(new URL('/dashboard', req.url))

  const { data: b } = await admin.from('bookings').select('id, renter_id, boat_id').eq('id', bookingId).single()
  if (!b) return NextResponse.redirect(new URL('/dashboard', req.url))
  const renterId = (b as { renter_id: string }).renter_id
  const boatId = (b as { boat_id: string }).boat_id

  const { data: boat } = await admin.from('boats').select('host_id').eq('id', boatId).single()
  const hostId = (boat as { host_id: string } | null)?.host_id
  if (!hostId) return NextResponse.redirect(new URL('/dashboard', req.url))

  // Only the two parties on this booking may open the thread.
  if (user.id !== hostId && user.id !== renterId) return NextResponse.redirect(new URL('/dashboard', req.url))

  // Get-or-create: one conversation per booking.
  const { data: existing } = await admin.from('conversations').select('id').eq('booking_id', bookingId).limit(1)
  let convId = (existing as { id: string }[] | null)?.[0]?.id
  if (!convId) {
    const { data: created } = await admin
      .from('conversations')
      .insert({ boat_id: boatId, booking_id: bookingId, participant_ids: [hostId, renterId] })
      .select('id')
      .single()
    convId = (created as { id: string } | null)?.id
  }
  if (!convId) return NextResponse.redirect(new URL('/dashboard/messages', req.url))
  return NextResponse.redirect(new URL(`/dashboard/messages?conversation=${convId}`, req.url))
}
