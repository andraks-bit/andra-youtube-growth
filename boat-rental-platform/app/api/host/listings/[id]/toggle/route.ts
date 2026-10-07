import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: boat } = await supabase
    .from('boats')
    .select('id, status, host_id')
    .eq('id', id)
    .eq('host_id', user.id)
    .single()

  if (!boat) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const newStatus = boat.status === 'active' ? 'paused' : 'active'
  const { error } = await supabase
    .from('boats')
    .update({ status: newStatus })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.redirect(new URL('/host/listings', _req.url))
}
