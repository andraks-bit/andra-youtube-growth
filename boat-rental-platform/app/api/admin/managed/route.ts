import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function requireAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 as const }
  const { data: me } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!(me as { is_admin?: boolean } | null)?.is_admin) return { error: 'Forbidden', status: 403 as const }
  return { user }
}

async function managedHostId(): Promise<string | null> {
  const { data } = await admin.from('profiles').select('id').eq('is_managed_account', true).maybeSingle()
  return (data as { id: string } | null)?.id ?? null
}

// List the managed fleet (boats under the BoatHire24 account) + owner contacts.
export async function GET() {
  const gate = await requireAdmin()
  if ('error' in gate) return NextResponse.json({ error: gate.error }, { status: gate.status })

  const hostId = await managedHostId()
  if (!hostId) return NextResponse.json({ hostId: null, boats: [] })

  const { data: boats } = await admin
    .from('boats')
    .select('id, name, slug, status, type, created_at, locations(city, country)')
    .eq('host_id', hostId)
    .order('created_at', { ascending: false })

  const ids = (boats ?? []).map((b: { id: string }) => b.id)
  const { data: contacts } = ids.length
    ? await admin.from('managed_owner_contacts').select('*').in('boat_id', ids)
    : { data: [] }

  const byBoat = new Map((contacts ?? []).map((c: { boat_id: string }) => [c.boat_id, c]))
  const fleet = (boats ?? []).map((b: Record<string, any>) => {
    const loc = Array.isArray(b.locations) ? b.locations[0] : b.locations
    return {
      ...b,
      location: loc ? `${loc.city ?? ''}${loc.country ? ', ' + loc.country : ''}` : '',
      owner: byBoat.get(b.id) ?? null,
    }
  })

  return NextResponse.json({ hostId, boats: fleet })
}

// Upsert the owner contact for a managed boat.
export async function POST(req: NextRequest) {
  const gate = await requireAdmin()
  if ('error' in gate) return NextResponse.json({ error: gate.error }, { status: gate.status })

  const body = await req.json().catch(() => ({}))
  const boatId = String(body?.boatId ?? '').trim()
  if (!boatId) return NextResponse.json({ error: 'boatId is required' }, { status: 400 })

  const row = {
    boat_id: boatId,
    owner_name: String(body?.owner_name ?? '').trim() || null,
    owner_email: String(body?.owner_email ?? '').trim() || null,
    owner_phone: String(body?.owner_phone ?? '').trim() || null,
    owner_website: String(body?.owner_website ?? '').trim() || null,
    notes: String(body?.notes ?? '').trim() || null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await admin
    .from('managed_owner_contacts')
    .upsert(row, { onConflict: 'boat_id' })
    .select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, owner: data })
}
