import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function DELETE() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Clean up related data first
  const { data: boats } = await supabaseAdmin
    .from('boats')
    .select('id')
    .eq('host_id', user.id)

  // Record this deletion in the admin audit trail BEFORE wiping data (best-effort —
  // the account is hard-deleted, so this row is the only trace left for admins).
  try {
    const { data: prof } = await supabaseAdmin
      .from('profiles').select('full_name, verification_status').eq('id', user.id).single()
    await supabaseAdmin.from('deleted_accounts').insert({
      user_id: user.id,
      email: user.email ?? null,
      full_name: (prof as { full_name?: string } | null)?.full_name ?? null,
      verification_status: (prof as { verification_status?: string } | null)?.verification_status ?? null,
      boats_count: (boats ?? []).length,
    })
  } catch { /* deleted_accounts table may not exist yet — never block the deletion */ }

  for (const boat of boats ?? []) {
    await supabaseAdmin.from('boat_images').delete().eq('boat_id', boat.id)
    await supabaseAdmin.from('boat_features').delete().eq('boat_id', boat.id)
    await supabaseAdmin.from('boat_pricing').delete().eq('boat_id', boat.id)
    await supabaseAdmin.from('availability').delete().eq('boat_id', boat.id)
    await supabaseAdmin.from('wishlists').delete().eq('boat_id', boat.id)
  }
  await supabaseAdmin.from('boats').delete().eq('host_id', user.id)
  await supabaseAdmin.from('wishlists').delete().eq('user_id', user.id)
  await supabaseAdmin.from('verification_documents').delete().eq('user_id', user.id)
  await supabaseAdmin.from('profiles').delete().eq('id', user.id)

  // Delete auth user last
  const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
