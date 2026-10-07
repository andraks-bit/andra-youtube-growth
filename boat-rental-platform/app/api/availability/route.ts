import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { AvailabilityStatus } from '@/types/database'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const boatId = searchParams.get('boat_id')
  if (!boatId) return NextResponse.json({ error: 'boat_id required' }, { status: 400 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('availability')
    .select('date, status')
    .eq('boat_id', boatId)
    .in('status', ['blocked', 'booked'])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ dates: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { boatId, dates, status } = await req.json() as { boatId: string; dates: string[]; status: AvailabilityStatus }
  if (!boatId || !dates || !status) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Verify host owns boat
  const { data: boat } = await supabase
    .from('boats')
    .select('id')
    .eq('id', boatId)
    .eq('host_id', user.id)
    .single()

  if (!boat) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const records = dates.map((date) => ({
    boat_id: boatId,
    date,
    status,
  }))

  const { error } = await supabase.from('availability').upsert(records as any)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
