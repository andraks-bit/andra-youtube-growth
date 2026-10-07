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

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  if (userId === user.id) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })

  // Block deleting other admins (safety)
  const { data: target } = await supabaseAdmin
    .from('profiles').select('is_admin').eq('id', userId).single()
  if (target?.is_admin) return NextResponse.json({ error: 'Cannot delete another admin' }, { status: 400 })

  // Cascade delete all user data
  const { data: boats } = await supabaseAdmin
    .from('boats').select('id').eq('host_id', userId)

  for (const boat of boats ?? []) {
    await supabaseAdmin.from('boat_images').delete().eq('boat_id', boat.id)
    await supabaseAdmin.from('boat_features').delete().eq('boat_id', boat.id)
    await supabaseAdmin.from('boat_pricing').delete().eq('boat_id', boat.id)
    await supabaseAdmin.from('availability').delete().eq('boat_id', boat.id)
    await supabaseAdmin.from('wishlists').delete().eq('boat_id', boat.id)
  }
  await supabaseAdmin.from('boats').delete().eq('host_id', userId)
  await supabaseAdmin.from('wishlists').delete().eq('user_id', userId)
  await supabaseAdmin.from('verification_documents').delete().eq('user_id', userId)
  await supabaseAdmin.from('profiles').delete().eq('id', userId)

  // Delete auth user last
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
