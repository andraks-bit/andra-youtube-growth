import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncBoatIcal } from '@/lib/ical-sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Daily re-sync of every boat that has connected an external calendar. Hosts also
// get an immediate sync on connect and a "Sync now" button, so this just catches
// drift. Secured by CRON_SECRET when set (Vercel sends it as a Bearer token).
export async function GET(req: NextRequest) {
  if (process.env.CRON_SECRET && req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data: boats } = await admin.from('boats').select('id, ical_url').not('ical_url', 'is', null)
  const list = (boats as { id: string; ical_url: string | null }[]) ?? []
  let ok = 0, failed = 0, imported = 0
  for (const b of list) {
    try { const r = await syncBoatIcal(b); ok++; imported += r.imported }
    catch { failed++ }
  }
  return NextResponse.json({ ok: true, boats: list.length, synced: ok, failed, imported })
}
