import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

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

// List all keys (admin only).
export async function GET() {
  const gate = await requireAdmin()
  if ('error' in gate) return NextResponse.json({ error: gate.error }, { status: gate.status })
  const { data } = await admin
    .from('api_keys')
    .select('id, key, host_id, label, active, created_at, last_used_at, profiles:host_id(full_name)')
    .order('created_at', { ascending: false })
  return NextResponse.json({ keys: data ?? [] })
}

// Generate a new key for a host.
export async function POST(req: NextRequest) {
  const gate = await requireAdmin()
  if ('error' in gate) return NextResponse.json({ error: gate.error }, { status: gate.status })
  const body = await req.json().catch(() => ({}))
  const hostId = String(body?.hostId ?? '').trim()
  const label = String(body?.label ?? '').trim().slice(0, 80) || null
  if (!hostId) return NextResponse.json({ error: 'hostId is required' }, { status: 400 })

  const { data: host } = await admin.from('profiles').select('id').eq('id', hostId).single()
  if (!host) return NextResponse.json({ error: 'Host not found' }, { status: 404 })

  const key = 'bh24_' + crypto.randomBytes(24).toString('hex')
  const { data, error } = await admin
    .from('api_keys').insert({ key, host_id: hostId, label }).select('id, key, label, active, created_at').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, key: data })
}

// Revoke / reactivate / delete a key.
export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin()
  if ('error' in gate) return NextResponse.json({ error: gate.error }, { status: gate.status })
  const body = await req.json().catch(() => ({}))
  const id = String(body?.id ?? '').trim()
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
  if (body?.delete === true) {
    const { error } = await admin.from('api_keys').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, deleted: true })
  }
  const active = body?.active !== false
  const { error } = await admin.from('api_keys').update({ active }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, active })
}
