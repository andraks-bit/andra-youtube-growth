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

// Edit a lead's contact details (email, website, phone, name) from the admin.
export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin()
  if ('error' in gate) return NextResponse.json({ error: gate.error }, { status: gate.status })

  const body = await req.json().catch(() => ({}))
  const id = String(body?.id ?? '').trim()
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const patch: Record<string, string | boolean | null> = {}
  if ('email' in body) patch.email = String(body.email ?? '').trim().slice(0, 160) || null
  if ('website' in body) patch.website = String(body.website ?? '').trim().slice(0, 300) || null
  if ('phone' in body) patch.phone = String(body.phone ?? '').trim().slice(0, 60) || null
  if ('contact_name' in body) patch.contact_name = String(body.contact_name ?? '').trim().slice(0, 120) || null
  if ('company' in body) patch.company = String(body.company ?? '').trim().slice(0, 160) || null
  if ('note' in body) patch.note = String(body.note ?? '').trim().slice(0, 2000) || null
  if ('verified_2x' in body) patch.verified_2x = body.verified_2x === true
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const { data, error } = await admin.from('listing_submissions').update(patch).eq('id', id)
    .select('id, contact_name, company, email, website, phone, note, verified_2x').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, lead: data })
}
