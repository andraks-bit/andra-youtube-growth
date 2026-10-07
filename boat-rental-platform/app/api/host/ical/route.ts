import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { syncBoatIcal, disconnectBoatIcal } from '@/lib/ical-sync'
import { normalizeIcalUrl } from '@/lib/ical'

export const runtime = 'nodejs'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const SITE = process.env.NEXT_PUBLIC_APP_URL || 'https://boathire24.com'

interface BoatRow { id: string; host_id: string; name: string; ical_url: string | null; ical_token: string | null; ical_last_sync: string | null; ical_sync_status: string | null; ical_sync_error: string | null }

// The boat's own host, or any admin, may manage its calendar sync.
async function ownedBoat(boatId: string, userId: string): Promise<BoatRow | null> {
  const { data: boat } = await admin.from('boats')
    .select('id, host_id, name, ical_url, ical_token, ical_last_sync, ical_sync_status, ical_sync_error')
    .eq('id', boatId).single()
  if (!boat) return null
  if ((boat as BoatRow).host_id === userId) return boat as BoatRow
  const { data: me } = await admin.from('profiles').select('is_admin').eq('id', userId).single()
  return (me as { is_admin?: boolean } | null)?.is_admin ? (boat as BoatRow) : null
}

async function ensureToken(boat: BoatRow): Promise<string> {
  if (boat.ical_token) return boat.ical_token
  const token = randomBytes(16).toString('hex')
  await admin.from('boats').update({ ical_token: token }).eq('id', boat.id)
  return token
}

// GET ?boatId= — current sync status + the export feed URL for this boat.
export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const boatId = new URL(req.url).searchParams.get('boatId') ?? ''
  const boat = boatId ? await ownedBoat(boatId, user.id) : null
  if (!boat) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const token = await ensureToken(boat)
  return NextResponse.json({
    icalUrl: boat.ical_url, lastSync: boat.ical_last_sync, status: boat.ical_sync_status,
    error: boat.ical_sync_error, feedUrl: `${SITE}/api/ical/${token}.ics`,
  })
}

// POST { boatId, url?, action? } — connect a calendar URL and sync, re-sync, or disconnect.
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const boatId = String(body.boatId ?? '').trim()
  const action = String(body.action ?? 'sync')
  if (!boatId) return NextResponse.json({ error: 'boatId is required' }, { status: 400 })
  const boat = await ownedBoat(boatId, user.id)
  if (!boat) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (action === 'disconnect') {
    await disconnectBoatIcal(boatId)
    return NextResponse.json({ ok: true, disconnected: true })
  }

  // Optionally set/replace the calendar URL, then sync.
  let url = boat.ical_url
  if ('url' in body) {
    const raw = String(body.url ?? '').trim()
    url = raw ? normalizeIcalUrl(raw) : null
    if (url && !/^https?:\/\//i.test(url)) return NextResponse.json({ error: 'Enter a valid calendar link (https:// or webcal://).' }, { status: 400 })
    await admin.from('boats').update({ ical_url: url }).eq('id', boatId)
  }
  const token = await ensureToken(boat)

  let imported = 0, error: string | null = null
  if (url) {
    try { ({ imported } = await syncBoatIcal({ id: boatId, ical_url: url })) }
    catch (e) { error = (e as Error).message }
  }
  const { data: fresh } = await admin.from('boats')
    .select('ical_url, ical_last_sync, ical_sync_status, ical_sync_error')
    .eq('id', boatId).single()
  const f = fresh as Pick<BoatRow, 'ical_url' | 'ical_last_sync' | 'ical_sync_status' | 'ical_sync_error'> | null
  return NextResponse.json({
    ok: !error, imported, error,
    icalUrl: f?.ical_url ?? url, lastSync: f?.ical_last_sync, status: f?.ical_sync_status,
    feedUrl: `${SITE}/api/ical/${token}.ics`,
  }, { status: error ? 502 : 200 })
}
