import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { findCountry } from '@/lib/countries'

export const runtime = 'nodejs'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

// Resolve a host-typed (city, country) into a locations row id — reusing an
// existing row when one matches (case-insensitive), otherwise creating one.
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { city: rawCity, country: rawCountry } = await req.json()
  const city = String(rawCity || '').trim()
  const country = String(rawCountry || '').trim()
  if (!city || !country) return NextResponse.json({ error: 'City and country are required' }, { status: 400 })

  const c = findCountry(country)
  if (!c) return NextResponse.json({ error: 'Unknown country' }, { status: 400 })

  // 1) Reuse an existing location for the same city + country (case-insensitive).
  const { data: existing } = await admin
    .from('locations')
    .select('id')
    .ilike('city', city)
    .eq('country', c.name)
    .limit(1)
    .maybeSingle()
  if (existing?.id) return NextResponse.json({ id: existing.id })

  // 2) Create a new location. lat/lng default to the country centroid; the host
  //    only types a city, and an exact marina pin isn't required to list.
  let slug = slugify(`${city}-${c.name}`)
  // Guard against a slug collision (different city/country that slugifies the same).
  const { data: slugTaken } = await admin.from('locations').select('id').eq('slug', slug).maybeSingle()
  if (slugTaken) slug = `${slug}-${Date.now().toString(36).slice(-4)}`

  const { data: created, error } = await admin
    .from('locations')
    .insert({
      slug, name: city, city, country: c.name, country_code: c.code,
      lat: c.lat, lng: c.lng, is_featured: false,
    })
    .select('id')
    .single()

  if (error || !created) {
    return NextResponse.json({ error: error?.message ?? 'Could not create location' }, { status: 500 })
  }
  return NextResponse.json({ id: created.id })
}
