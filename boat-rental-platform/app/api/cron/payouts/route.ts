import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'
import { sendHostPayoutSent, sendOpsPayoutDigest } from '@/lib/email/payouts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Daily payout automation (secured by CRON_SECRET when set):
//   1. Confirmed bookings whose trip has ended → status 'completed'.
//   2. Each completed booking gets exactly one payouts row (unique booking_id = the
//      idempotency claim; a Stripe idempotency key backstops the transfer itself).
//      • Destination charge (host had Stripe at payment time) → 85% already routed; mark paid.
//      • Host has Stripe now but funds are on the platform → stripe.transfers.create the 85%.
//      • No Stripe account → 'manual_bank' due; ops gets a digest with the bank details.
//   3. Failed / still-due payouts are retried on every run (e.g. host connects Stripe later).
export async function GET(req: NextRequest) {
  if (process.env.CRON_SECRET && req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const nowIso = new Date().toISOString()
  const horizon = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString() // ignore ancient bookings

  // ── 1. Mark finished trips as completed.
  const { data: finished, error: e1 } = await admin
    .from('bookings')
    .update({ status: 'completed' })
    .eq('status', 'confirmed')
    .lt('end_datetime', nowIso)
    .gt('end_datetime', horizon)
    .select('id')
  if (e1) return NextResponse.json({ error: `complete step: ${e1.message}` }, { status: 500 })

  // ── 2. Completed bookings that have no payout yet.
  const { data: completedRaw, error: e2 } = await admin
    .from('bookings')
    .select('id, boat_id, total, service_fee, currency, stripe_payment_intent_id, end_datetime')
    .eq('status', 'completed')
    .gt('end_datetime', horizon)
    .order('end_datetime', { ascending: false })
    .limit(100)
  if (e2) {
    // Most likely the payouts migration hasn't been applied yet — surface clearly in cron logs.
    return NextResponse.json({ error: `select step: ${e2.message}` }, { status: 500 })
  }
  const completed = (completedRaw ?? []) as {
    id: string; boat_id: string; total: number; service_fee: number; currency: string
    stripe_payment_intent_id: string | null; end_datetime: string
  }[]

  const ids = completed.map((b) => b.id)
  const { data: existingRaw, error: e3 } = ids.length
    ? await admin.from('payouts').select('booking_id, status, method').in('booking_id', ids)
    : { data: [], error: null }
  if (e3) return NextResponse.json({ error: `payouts table missing? Apply migration 007. (${e3.message})` }, { status: 500 })
  const havePayout = new Set(((existingRaw ?? []) as { booking_id: string }[]).map((p) => p.booking_id))

  const stats = { completedNow: finished?.length ?? 0, paidDestination: 0, transferred: 0, manualDue: 0, failed: 0, retriedPaid: 0 }
  const opsDue: Parameters<typeof sendOpsPayoutDigest>[0]['due'] = []
  const opsFailed: Parameters<typeof sendOpsPayoutDigest>[0]['failed'] = []

  // Resolve a booking's PaymentIntent (the column sometimes holds a checkout-session id).
  async function resolvePi(ref: string | null) {
    if (!ref) return null
    try {
      if (ref.startsWith('pi_')) return await stripe.paymentIntents.retrieve(ref)
      if (ref.startsWith('cs_')) {
        const session = await stripe.checkout.sessions.retrieve(ref)
        const piId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
        return piId ? await stripe.paymentIntents.retrieve(piId) : null
      }
    } catch { /* PI gone — treat as unresolvable */ }
    return null
  }

  async function hostFor(boatId: string) {
    const { data: boat } = await admin.from('boats').select('name, host_id').eq('id', boatId).single()
    const hostId = (boat as { host_id: string } | null)?.host_id
    if (!hostId) return null
    const { data: prof } = await admin.from('profiles').select('full_name, stripe_account_id').eq('id', hostId).single()
    return {
      hostId,
      boatName: (boat as { name: string }).name,
      hostName: (prof as { full_name: string | null } | null)?.full_name ?? 'Host',
      stripeAccountId: (prof as { stripe_account_id: string | null } | null)?.stripe_account_id ?? null,
    }
  }

  // Try to pay one claimed payout row. Returns the final status.
  async function settle(payoutId: string, booking: typeof completed[number], notify: boolean) {
    const host = await hostFor(booking.boat_id)
    if (!host) {
      await admin.from('payouts').update({ status: 'failed', error: 'boat or host missing' }).eq('id', payoutId)
      stats.failed++
      return
    }
    const amount = Math.max(0, booking.total - booking.service_fee)
    const pi = await resolvePi(booking.stripe_payment_intent_id)

    // Destination charge: the 85% was already routed to the host at capture.
    if (pi?.transfer_data?.destination) {
      await admin.from('payouts').update({
        method: 'stripe_destination', status: 'paid', paid_at: new Date().toISOString(), error: null,
      }).eq('id', payoutId)
      stats.paidDestination++
      if (notify) await sendHostPayoutSent({ hostId: host.hostId, boatName: host.boatName, amount, currency: booking.currency, method: 'stripe_destination' })
      return
    }

    // Platform-held funds + host has Stripe → transfer the 85% now.
    if (host.stripeAccountId && pi?.status === 'succeeded') {
      try {
        const transfer = await stripe.transfers.create({
          amount: Math.round(amount * 100),
          currency: booking.currency.toLowerCase(),
          destination: host.stripeAccountId,
          transfer_group: `booking_${booking.id}`,
          metadata: { bookingId: booking.id },
        }, { idempotencyKey: `payout-${booking.id}` })
        await admin.from('payouts').update({
          method: 'stripe_transfer', status: 'paid', stripe_transfer_id: transfer.id,
          paid_at: new Date().toISOString(), error: null,
        }).eq('id', payoutId)
        stats.transferred++
        await sendHostPayoutSent({ hostId: host.hostId, boatName: host.boatName, amount, currency: booking.currency, method: 'stripe_transfer' })
      } catch (e) {
        const msg = ((e as Error).message ?? 'transfer failed').slice(0, 300)
        await admin.from('payouts').update({ status: 'failed', method: 'stripe_transfer', error: msg }).eq('id', payoutId)
        stats.failed++
        opsFailed.push({ hostName: host.hostName, boatName: host.boatName, amount, currency: booking.currency, error: msg, bookingId: booking.id })
      }
      return
    }

    // No Stripe account (or no traceable payment) → manual bank payout for ops.
    const { data: bank } = await admin.from('payout_methods').select('iban, account_number, bank_name, bank_country, account_holder_name').eq('host_id', host.hostId).maybeSingle()
    const bk = bank as { iban: string | null; account_number: string | null; bank_name: string | null; bank_country: string | null; account_holder_name: string | null } | null
    await admin.from('payouts').update({ method: 'manual_bank', status: 'due', error: null }).eq('id', payoutId)
    stats.manualDue++
    const { data: hostUser } = await admin.auth.admin.getUserById(host.hostId).catch(() => ({ data: { user: null } as any }))
    opsDue.push({
      hostName: host.hostName,
      hostEmail: hostUser?.user?.email ?? null,
      boatName: host.boatName,
      amount,
      currency: booking.currency,
      iban: bk?.iban ?? bk?.account_number ?? null,
      bankNote: bk ? `${bk.account_holder_name ?? ''} · ${bk.bank_name ?? ''} (${bk.bank_country ?? '?'})`.trim() : null,
      bookingId: booking.id,
    })
  }

  // ── New payouts: claim then settle. Only notify hosts about recently finished
  // trips, so the first run doesn't email people about month-old bookings.
  const recentCutoff = Date.now() - 14 * 24 * 60 * 60 * 1000
  for (const booking of completed) {
    if (havePayout.has(booking.id)) continue
    const host = await hostFor(booking.boat_id)
    if (!host) continue
    const amount = Math.max(0, booking.total - booking.service_fee)
    const { data: claimed, error: claimErr } = await admin
      .from('payouts')
      .insert({ booking_id: booking.id, host_id: host.hostId, amount, currency: booking.currency, method: 'none', status: 'processing' })
      .select('id')
      .single()
    if (claimErr || !claimed) continue // unique violation = another run claimed it
    const recent = new Date(booking.end_datetime).getTime() > recentCutoff
    await settle((claimed as { id: string }).id, booking, recent)
  }

  // ── Retries: failed transfers + stale 'processing' claims (crashed runs).
  const staleCutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const [{ data: failedRaw }, { data: staleRaw }] = await Promise.all([
    admin.from('payouts').select('id, booking_id').eq('status', 'failed').limit(20),
    admin.from('payouts').select('id, booking_id').eq('status', 'processing').lt('created_at', staleCutoff).limit(20),
  ])
  const retryRaw = [...(failedRaw ?? []), ...(staleRaw ?? [])]
  for (const r of (retryRaw ?? []) as { id: string; booking_id: string }[]) {
    const { data: bRaw } = await admin
      .from('bookings')
      .select('id, boat_id, total, service_fee, currency, stripe_payment_intent_id, end_datetime')
      .eq('id', r.booking_id)
      .single()
    if (!bRaw) continue
    const before = stats.failed
    await settle(r.id, bRaw as typeof completed[number], false)
    if (stats.failed === before) stats.retriedPaid++
  }

  if (opsDue.length || opsFailed.length) await sendOpsPayoutDigest({ due: opsDue, failed: opsFailed })

  return NextResponse.json({ ok: true, ...stats })
}
