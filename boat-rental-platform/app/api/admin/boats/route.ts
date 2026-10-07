import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/admin/boats?userId=xxx
export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: me } = await supabaseAdmin
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!me?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const { data: boats } = await supabaseAdmin
    .from('boats')
    .select(`
      id, slug, name, tagline, description, admin_note, type, status,
      length_m, capacity_pax, cabins, builder, model_year,
      departure_port, includes_skipper, includes_fuel, includes_drinks,
      min_hours, pricing_type, instant_book, cancellation_policy,
      created_at,
      location_id,
      boat_images (storage_url, is_hero, sort_order),
      boat_pricing (duration_hours, price, currency, season),
      boat_features (feature)
    `)
    .eq('host_id', userId)
    .order('created_at', { ascending: false })

  // Get location names
  const locationIds = Array.from(new Set((boats ?? []).map((b) => b.location_id).filter(Boolean)))
  const { data: locs } = locationIds.length > 0
    ? await supabaseAdmin.from('locations').select('id, name, city, country').in('id', locationIds)
    : { data: [] }
  const locMap = Object.fromEntries((locs ?? []).map((l) => [l.id, l]))

  // Booking counts per boat
  const boatIds = (boats ?? []).map((b) => b.id)
  const { data: bookings } = boatIds.length > 0
    ? await supabaseAdmin.from('bookings').select('boat_id, status').in('boat_id', boatIds)
    : { data: [] }
  const bookingMap: Record<string, { total: number; confirmed: number; pending: number }> = {}
  for (const b of bookings ?? []) {
    if (!bookingMap[b.boat_id]) bookingMap[b.boat_id] = { total: 0, confirmed: 0, pending: 0 }
    bookingMap[b.boat_id].total++
    if (b.status === 'confirmed' || b.status === 'completed') bookingMap[b.boat_id].confirmed++
    if (b.status === 'pending') bookingMap[b.boat_id].pending++
  }

  const enriched = (boats ?? []).map((b) => ({
    ...b,
    location: locMap[b.location_id] ?? null,
    bookings: bookingMap[b.id] ?? { total: 0, confirmed: 0, pending: 0 },
  }))

  return NextResponse.json({ boats: enriched })
}
