import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Public boat feed in the standard BoatHire24 import format.
// This is exactly the shape the /api/host/import-feed importer expects, so it
// both documents the format and lets partner sites pull our active fleet.
// Optional: ?host=<uuid> to scope to one operator, ?limit=<n>.
export async function GET(req: NextRequest) {
  const host = req.nextUrl.searchParams.get('host')
  const limit = Math.min(500, Number(req.nextUrl.searchParams.get('limit')) || 200)

  let q = admin
    .from('boats')
    .select('id, name, tagline, description, type, length_m, capacity_pax, builder, model_year, departure_port, min_hours, instant_book, boat_images(storage_url, is_hero, sort_order), boat_pricing(duration_hours, price, currency), boat_features(feature), locations(city, country)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (host) q = q.eq('host_id', host)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const boats = (data ?? []).map((b: any) => {
    const imgs = [...(b.boat_images ?? [])].sort((a, b2) => (b2.is_hero ? 1 : 0) - (a.is_hero ? 1 : 0) || (a.sort_order ?? 0) - (b2.sort_order ?? 0))
    return {
      external_id: b.id,
      name: b.name,
      tagline: b.tagline,
      description: b.description,
      type: b.type,
      length_m: b.length_m,
      capacity_pax: b.capacity_pax,
      builder: b.builder,
      model_year: b.model_year,
      departure_port: b.departure_port,
      location_name: b.locations ? `${b.locations.city}, ${b.locations.country}` : undefined,
      min_hours: b.min_hours,
      instant_book: b.instant_book,
      currency: b.boat_pricing?.[0]?.currency ?? 'EUR',
      pricing: (b.boat_pricing ?? []).map((p: any) => ({ duration_hours: p.duration_hours, price: p.price, currency: p.currency })),
      images: imgs.map((i: any) => i.storage_url),
      features: (b.boat_features ?? []).map((f: any) => f.feature).filter((f: string) => !f.startsWith('__')),
    }
  })

  return NextResponse.json(
    { generated_at: new Date().toISOString(), count: boats.length, boats },
    { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' } },
  )
}
