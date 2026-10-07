import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const SITE = 'https://boathire24.com'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

// Public partner API: returns the fleet (active boats) of the host the API key
// belongs to. Auth: `Authorization: Bearer <key>` or `?api_key=<key>`.
export async function GET(req: NextRequest) {
  const headerKey = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  const key = headerKey || req.nextUrl.searchParams.get('api_key')?.trim() || ''
  if (!key) {
    return NextResponse.json({ error: 'Missing API key. Pass it as "Authorization: Bearer <key>" or ?api_key=<key>.' }, { status: 401, headers: CORS })
  }

  const { data: row } = await admin
    .from('api_keys').select('id, host_id, active').eq('key', key).maybeSingle()
  if (!row || !(row as { active: boolean }).active) {
    return NextResponse.json({ error: 'Invalid or revoked API key.' }, { status: 401, headers: CORS })
  }
  const hostId = (row as { host_id: string }).host_id

  const { data: boats, error } = await admin
    .from('boats')
    .select(`id, slug, name, tagline, description, type, length_m, capacity_pax, cabins,
             builder, model_year, departure_port, includes_skipper, includes_fuel, includes_drinks,
             min_hours, cancellation_policy,
             boat_images(storage_url, alt, sort_order, is_hero),
             boat_pricing(duration_hours, price, currency),
             boat_features(feature),
             locations(city, country, slug)`)
    .eq('host_id', hostId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: CORS })

  // touch last_used_at (non-blocking)
  admin.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', (row as { id: string }).id).then(() => {}, () => {})

  const fleet = (boats ?? []).map((b: any) => {
    const imgs = [...(b.boat_images ?? [])].sort((x, y) => (y.is_hero ? 1 : 0) - (x.is_hero ? 1 : 0) || (x.sort_order ?? 0) - (y.sort_order ?? 0))
    const features = (b.boat_features ?? []).map((f: any) => f.feature).filter((f: string) => !f.startsWith('__REFUND_POLICY__::'))
    return {
      id: b.id,
      name: b.name,
      tagline: b.tagline,
      description: b.description,
      type: b.type,
      length_m: b.length_m,
      capacity: b.capacity_pax,
      cabins: b.cabins,
      builder: b.builder,
      model_year: b.model_year,
      location: b.locations ? { city: b.locations.city, country: b.locations.country } : null,
      departure_port: b.departure_port,
      includes: { skipper: b.includes_skipper, fuel: b.includes_fuel, drinks: b.includes_drinks },
      min_hours: b.min_hours,
      cancellation_policy: b.cancellation_policy,
      features,
      images: imgs.map((i: any) => i.storage_url),
      pricing: (b.boat_pricing ?? []).map((p: any) => ({ duration_hours: p.duration_hours, price: p.price, currency: p.currency })),
      url: `${SITE}/boats/${b.slug}`,
    }
  })

  return NextResponse.json({ count: fleet.length, boats: fleet }, { headers: { ...CORS, 'Cache-Control': 'public, max-age=300' } })
}
