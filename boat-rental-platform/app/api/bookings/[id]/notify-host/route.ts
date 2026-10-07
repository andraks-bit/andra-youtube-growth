import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendHostNewRequest } from '@/lib/email/bookings'

// Called by the checkout page the moment a request-to-book hold is authorized,
// so the host is emailed + WhatsApp'd without depending on Stripe webhook config.
// sendHostNewRequest is idempotent (PI metadata flag) + guards on requires_capture.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only the booker who owns this booking may trigger its host notification.
  const { data: booking } = await supabase
    .from('bookings')
    .select('renter_id')
    .eq('id', id)
    .single()
  if (!booking || (booking as { renter_id: string }).renter_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await sendHostNewRequest(id)
  return NextResponse.json({ ok: true })
}
