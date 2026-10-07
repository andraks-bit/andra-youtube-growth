import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateICS, daysToRanges } from '@/lib/ical'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Public export feed: a host subscribes to this from iCloud / Google / etc. and
// sees the boat's BoatHire24 bookings + their own manual blocks in their calendar.
// We deliberately DO NOT re-export blocks we imported from their calendar
// (source='ical') — that would create a sync feedback loop.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token: raw } = await params
  const token = String(raw ?? '').replace(/\.ics$/i, '')
  if (!token) return new Response('Not found', { status: 404 })

  const { data: boat } = await admin.from('boats').select('id, name').eq('ical_token', token).maybeSingle()
  if (!boat) return new Response('Not found', { status: 404 })
  const b = boat as { id: string; name: string }

  const { data: rows } = await admin.from('availability')
    .select('date, status, source')
    .eq('boat_id', b.id)
    .in('status', ['booked', 'blocked'])
  const days = (rows as { date: string; status: string; source: string | null }[] ?? [])
    .filter((r) => r.status === 'booked' || r.source !== 'ical')
    .map((r) => r.date)

  const events = daysToRanges(days).map((r) => ({
    uid: `bh24-${b.id}-${r.start}@boathire24.com`,
    startDate: r.start,
    endDateExclusive: r.endExclusive,
    summary: `${b.name} — unavailable (BoatHire24)`,
  }))
  const ics = generateICS({ calName: `${b.name} — BoatHire24`, events })

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="boathire24-${token}.ics"`,
      // Short cache so another platform / calendar app syncing FROM this feed sees
      // changes within minutes (Tono's agency-to-agency case), served-stale while
      // revalidating to keep origin load low.
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
    },
  })
}
