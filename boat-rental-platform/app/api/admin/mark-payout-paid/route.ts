import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { sendHostPayoutSent } from '@/lib/email/payouts'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Admin marks a manual bank payout as paid (after sending the actual bank transfer).
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!(profile as any)?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { payoutId } = await req.json().catch(() => ({}))
  if (!payoutId) return NextResponse.json({ error: 'Missing payoutId' }, { status: 400 })

  const { data: payout } = await admin
    .from('payouts')
    .select('id, host_id, booking_id, amount, currency, status, method')
    .eq('id', payoutId)
    .single()
  if (!payout) return NextResponse.json({ error: 'Payout not found' }, { status: 404 })
  if ((payout as any).status === 'paid') return NextResponse.json({ ok: true, already: true })

  const { error } = await admin
    .from('payouts')
    .update({ status: 'paid', method: 'manual_bank', paid_at: new Date().toISOString(), error: null })
    .eq('id', payoutId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Tell the host their bank transfer is on the way.
  const { data: booking } = await admin.from('bookings').select('boat_id').eq('id', (payout as any).booking_id).single()
  const { data: boat } = booking
    ? await admin.from('boats').select('name').eq('id', (booking as any).boat_id).single()
    : { data: null }
  await sendHostPayoutSent({
    hostId: (payout as any).host_id,
    boatName: (boat as any)?.name ?? 'your boat',
    amount: (payout as any).amount,
    currency: (payout as any).currency,
    method: 'manual_bank',
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}
