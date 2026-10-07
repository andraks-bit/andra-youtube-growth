import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'
import { sendBookerDeclined } from '@/lib/email/bookings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Auto-release request-to-book holds the host never actioned.
// Vercel Cron hits this on a schedule; secured by CRON_SECRET when set.
export async function GET(req: NextRequest) {
  if (process.env.CRON_SECRET && req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Pending requests older than 48h are expired (guests get a payment reminder at
  // 24h via /api/cron/reminders before the hold is released here).
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  const { data: stale, error } = await admin
    .from('bookings')
    .select('id, stripe_payment_intent_id')
    .eq('status', 'pending')
    .lt('created_at', cutoff)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const cancelable = ['requires_capture', 'requires_payment_method', 'requires_confirmation', 'requires_action']
  let expired = 0
  let notified = 0

  for (const b of stale ?? []) {
    const piId = (b as any).stripe_payment_intent_id as string | null
    let wasAuthorized = false
    if (piId) {
      try {
        const pi = await stripe.paymentIntents.retrieve(piId)
        wasAuthorized = pi.status === 'requires_capture' // a real, money-held request (not an abandoned checkout)
        if (cancelable.includes(pi.status)) await stripe.paymentIntents.cancel(piId)
      } catch { /* PI already gone/settled — fall through to mark cancelled */ }
    }
    await admin.from('bookings').update({ status: 'cancelled' }).eq('id', (b as any).id)
    if (wasAuthorized) { await sendBookerDeclined((b as any).id); notified++ } // email + WhatsApp: "not charged, hold released"
    expired++
  }

  return NextResponse.json({ ok: true, expired, notified })
}
