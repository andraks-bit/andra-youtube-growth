import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Admin: delete a lead (listing_submission). Its boats are NOT destroyed —
// they're ungrouped (submission_id set to null) and stay under "All boats", so
// no real listing is lost by removing a lead. Delete boats individually if
// they should go too.
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: me } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!(me as { is_admin?: boolean } | null)?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const submissionId = String((await req.json().catch(() => ({}))).submissionId ?? '').trim()
  if (!submissionId) return NextResponse.json({ error: 'submissionId is required' }, { status: 400 })

  // Keep the boats — just detach them from the lead being removed.
  await admin.from('boats').update({ submission_id: null }).eq('submission_id', submissionId)

  const { error } = await admin.from('listing_submissions').delete().eq('id', submissionId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
