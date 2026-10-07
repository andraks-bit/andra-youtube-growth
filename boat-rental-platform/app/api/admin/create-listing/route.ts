import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: me } = await supabaseAdmin
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { hostId, slug: slugBase, ...boatFields } = body
  if (!hostId) return NextResponse.json({ error: 'Missing hostId' }, { status: 400 })

  // Make sure host exists
  const { data: { user: target } } = await supabaseAdmin.auth.admin.getUserById(hostId)
  if (!target) return NextResponse.json({ error: 'Target user not found' }, { status: 404 })

  // Dedupe the (already keyword-rich) slug with -2, -3… on collision.
  const base = String(slugBase || 'boat')
  let boat: { id: string } | null = null
  let error: { message: string } | null = null
  for (let n = 1; n <= 12 && !boat; n++) {
    const slug = n === 1 ? base : `${base}-${n}`
    // Admin-listed boats always start as drafts — host must review & activate.
    const r = await supabaseAdmin
      .from('boats')
      .insert({ host_id: hostId, ...boatFields, slug, status: 'draft' })
      .select('id')
      .single()
    if (!r.error) { boat = r.data as { id: string }; break }
    error = r.error
    if ((r.error as { code?: string }).code !== '23505') break
  }

  if (!boat) {
    return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 })
  }

  return NextResponse.json({ id: boat.id, ok: true })
}
