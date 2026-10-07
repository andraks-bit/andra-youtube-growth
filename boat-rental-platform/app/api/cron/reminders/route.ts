import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTripReminder, sendPaymentReminder } from '@/lib/email/bookings'
import { sendDraftPublishReminder } from '@/lib/email/drafts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Reminders cron (daily on Hobby, can run more often on Pro; secured by CRON_SECRET when set):
//   • Trip reminder    — confirmed bookings starting within the next 48h (wide enough
//     that a once-a-day run still reminds every guest ~24h+ before departure).
//   • Payment reminder — pending (unpaid) bookings 24h+ old (auto-cancelled at 48h
//     by /api/cron/expire-requests). Each reminder fires at most once via the
//     *_reminder_sent_at flags.
export async function GET(req: NextRequest) {
  if (process.env.CRON_SECRET && req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = Date.now()
  const in48h = new Date(now + 48 * 60 * 60 * 1000).toISOString()
  const nowIso = new Date(now).toISOString()
  const ago24h = new Date(now - 24 * 60 * 60 * 1000).toISOString()
  const ago48h = new Date(now - 48 * 60 * 60 * 1000).toISOString()

  let tripReminders = 0
  let paymentReminders = 0

  // ── Trip reminders: confirmed bookings starting in the next 24h, not yet reminded.
  const { data: upcoming, error: e1 } = await admin
    .from('bookings')
    .select('id')
    .eq('status', 'confirmed')
    .is('trip_reminder_sent_at', null)
    .gt('start_datetime', nowIso)
    .lte('start_datetime', in48h)
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })

  for (const b of upcoming ?? []) {
    const id = (b as { id: string }).id
    // Claim first (idempotent even if the send is slow / the run overlaps).
    await admin.from('bookings').update({ trip_reminder_sent_at: new Date().toISOString() }).eq('id', id)
    await sendTripReminder(id)
    tripReminders++
  }

  // ── Payment reminders: pending bookings between 24h and 48h old, not yet reminded.
  const { data: unpaid, error: e2 } = await admin
    .from('bookings')
    .select('id')
    .eq('status', 'pending')
    .is('payment_reminder_sent_at', null)
    .lt('created_at', ago24h)
    .gt('created_at', ago48h)
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })

  for (const b of unpaid ?? []) {
    const id = (b as { id: string }).id
    await admin.from('bookings').update({ payment_reminder_sent_at: new Date().toISOString() }).eq('id', id)
    await sendPaymentReminder(id)
    paymentReminders++
  }

  // ── Draft-publish reminders: boats a host left in draft 24h+ after adding,
  // reminded at most once (draft_reminder_sent_at). One email per host listing
  // all their unpublished boats. Skips admin + managed accounts (the operator's
  // own workflow — they publish those from the admin panel).
  let draftReminders = 0
  const { data: staleDrafts } = await admin
    .from('boats')
    .select('id, name, slug, host_id')
    .eq('status', 'draft')
    .is('draft_reminder_sent_at', null)
    .lt('created_at', ago24h)

  const byHost = new Map<string, { ids: string[]; boats: { name: string; slug: string }[] }>()
  for (const b of (staleDrafts ?? []) as { id: string; name: string; slug: string; host_id: string }[]) {
    const g = byHost.get(b.host_id) ?? { ids: [], boats: [] }
    g.ids.push(b.id); g.boats.push({ name: b.name, slug: b.slug })
    byHost.set(b.host_id, g)
  }

  if (byHost.size) {
    const hostIds = [...byHost.keys()]
    const { data: profs } = await admin.from('profiles')
      .select('id, full_name, is_admin, is_managed_account').in('id', hostIds)
    const profMap = new Map((profs ?? []).map((p) => [(p as { id: string }).id, p as { full_name: string | null; is_admin: boolean; is_managed_account: boolean }]))

    for (const [hostId, g] of byHost) {
      const p = profMap.get(hostId)
      if (!p || p.is_admin || p.is_managed_account) continue // real self-serve hosts only
      // Claim first so a slow/overlapping run never double-sends.
      await admin.from('boats').update({ draft_reminder_sent_at: new Date().toISOString() }).in('id', g.ids)
      try {
        const sent = await sendDraftPublishReminder({ hostId, hostName: p.full_name, boats: g.boats })
        if (sent) draftReminders++
      } catch { /* logged in the mailer; flag stays set so we don't retry-spam */ }
    }
  }

  return NextResponse.json({ ok: true, tripReminders, paymentReminders, draftReminders })
}
