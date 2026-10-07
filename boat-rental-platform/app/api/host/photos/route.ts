import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Photo operations on a listing (delete / set cover / reorder), performed with
// the service role after an explicit ownership check. Browser-side writes under
// RLS fail SILENTLY (0 rows, no error) when a policy doesn't match — hosts saw
// photos "delete" then reappear on reload. This endpoint always either works or
// returns a real error.
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const op = String(body?.op ?? '')
  const imageId = String(body?.imageId ?? '').trim()
  if (!imageId || !['delete', 'cover', 'sort'].includes(op)) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  // Resolve the image → boat → owner; admins may manage any listing's photos.
  const { data: img } = await admin.from('boat_images').select('id, boat_id').eq('id', imageId).maybeSingle()
  if (!img) return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
  const { data: boat } = await admin.from('boats').select('id, host_id').eq('id', (img as { boat_id: string }).boat_id).single()
  const { data: me } = await admin.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  const allowed = (boat as { host_id: string } | null)?.host_id === user.id || (me as { is_admin?: boolean } | null)?.is_admin
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const boatId = (img as { boat_id: string }).boat_id

  if (op === 'delete') {
    const { error } = await admin.from('boat_images').delete().eq('id', imageId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else if (op === 'cover') {
    await admin.from('boat_images').update({ is_hero: false }).eq('boat_id', boatId)
    const { error } = await admin.from('boat_images').update({ is_hero: true }).eq('id', imageId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else if (op === 'sort') {
    const sortOrder = Number(body?.sortOrder)
    const otherId = String(body?.otherId ?? '').trim()
    const otherSort = Number(body?.otherSort)
    if (!Number.isFinite(sortOrder)) return NextResponse.json({ error: 'sortOrder required' }, { status: 400 })
    const { error } = await admin.from('boat_images').update({ sort_order: sortOrder }).eq('id', imageId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (otherId && Number.isFinite(otherSort)) {
      // swap partner (must belong to the same boat)
      await admin.from('boat_images').update({ sort_order: otherSort }).eq('id', otherId).eq('boat_id', boatId)
    }
  }

  return NextResponse.json({ ok: true })
}
