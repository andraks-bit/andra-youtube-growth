import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Admin: permanently delete a boat listing. Child rows (pricing, images,
// features, availability, wishlists) cascade automatically; reviews and
// conversations don't, so we clear them first. A boat with bookings is kept —
// the delete errors and we surface a friendly message.
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: me } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!(me as { is_admin?: boolean } | null)?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const boatId = String((await req.json().catch(() => ({}))).boatId ?? '').trim()
  if (!boatId) return NextResponse.json({ error: 'boatId is required' }, { status: 400 })

  await admin.from('reviews').delete().eq('boat_id', boatId)
  await admin.from('conversations').delete().eq('boat_id', boatId)

  const { error } = await admin.from('boats').delete().eq('id', boatId)
  if (error) {
    const msg = /foreign key|violates/i.test(error.message)
      ? 'This boat has bookings and can’t be deleted.'
      : error.message
    return NextResponse.json({ error: msg }, { status: 409 })
  }
  return NextResponse.json({ ok: true })
}
