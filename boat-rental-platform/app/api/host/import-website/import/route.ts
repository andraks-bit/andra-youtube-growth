import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { mapBoatType, slugify } from '@/lib/import/website'
import { buildBoatSlug, uniqueBoatSlug } from '@/lib/slug'

export const runtime = 'nodejs'
export const maxDuration = 60

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Download a photo from the company site and re-host it in our storage so the
// listing keeps working if their site changes. Falls back to hotlinking.
async function rehostImage(url: string, boatId: string, i: number): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BoatHire24Importer/1.0)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return url
    const ct = res.headers.get('content-type') ?? ''
    if (!ct.startsWith('image/')) return url
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 5_000 || buf.length > 10_000_000) return url // skip icons and oversized files
    const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg'
    const path = `boats/${boatId}/web-${Date.now().toString(36)}-${i}.${ext}`
    const { data, error } = await admin.storage.from('boat-images').upload(path, buf, { contentType: ct, upsert: false })
    if (error || !data) return url
    return admin.storage.from('boat-images').getPublicUrl(data.path).data.publicUrl
  } catch {
    return url
  }
}

// Step 3 of the website importer: create ONE extracted boat as a listing.
// The client loops over the boats the host ticked, one request per boat.
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const b = body?.boat
  let locationId = String(body?.locationId ?? '').trim()
  const country = String(body?.country ?? '').trim().slice(0, 80)
  const city = String(body?.city ?? '').trim().slice(0, 80)
  const countryCode = (String(body?.countryCode ?? '').trim().toUpperCase().slice(0, 2)) || 'XX'
  const priceOnRequest = body?.priceOnRequest === true
  const submissionId = String(body?.submissionId ?? '').trim() || null
  const status = body?.status === 'active' ? 'active' : 'draft'
  const name = String(b?.name ?? '').trim().slice(0, 120)
  if (!b || !name) return NextResponse.json({ error: 'Missing boat data' }, { status: 400 })
  if (!locationId && !city) return NextResponse.json({ error: 'Pick a country and write the city for the imported boats' }, { status: 400 })

  // Admin concierge: optionally import on behalf of another host (boats land as
  // drafts under that host's account for them to review).
  let hostId = user.id
  const targetHostId = String(body?.targetHostId ?? '').trim()
  if (targetHostId && targetHostId !== user.id) {
    const { data: me } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!(me as { is_admin?: boolean } | null)?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { data: { user: target } } = await admin.auth.admin.getUserById(targetHostId)
    if (!target) return NextResponse.json({ error: 'Target host not found' }, { status: 404 })
    hostId = targetHostId
  }

  // Resolve location from a free-text country + city (find-or-create) when no
  // explicit locationId was passed.
  if (!locationId && city) {
    const { data: found } = await admin.from('locations').select('id')
      .ilike('city', city).ilike('country', country || '%').limit(1)
    const hit = (found as { id: string }[] | null)?.[0]
    if (hit) {
      locationId = hit.id
    } else {
      const slug = `${slugify(`${city}-${country || 'loc'}`)}-${Date.now().toString(36)}`
      const { data: ins, error: locErr } = await admin.from('locations')
        .insert({ slug, name: city, city, country: country || 'Unknown', country_code: countryCode, lat: 0, lng: 0 })
        .select('id').single()
      if (locErr || !ins) return NextResponse.json({ error: locErr?.message ?? 'Could not create location' }, { status: 500 })
      locationId = (ins as { id: string }).id
    }
  }
  if (!locationId) return NextResponse.json({ error: 'Could not determine a location' }, { status: 400 })

  // When "price on request" is on, skip all pricing — the boat page then shows
  // an enquiry form instead of a price table.
  const pricing = priceOnRequest ? [] : (Array.isArray(b.pricing) ? b.pricing : [])
    .map((p: any) => ({ duration_hours: Math.round(Number(p?.duration_hours)), price: Math.round(Number(p?.price)) }))
    .filter((p: any) => p.duration_hours >= 1 && p.duration_hours <= 720 && p.price > 0)
    .slice(0, 6)
  const currency = /^[A-Z]{3}$/.test(String(b.currency ?? '').toUpperCase()) ? String(b.currency).toUpperCase() : 'EUR'

  const row: any = {
    host_id: hostId,
    location_id: locationId,
    name,
    tagline: String(b.tagline ?? '').trim().slice(0, 200) || null,
    description: String(b.description ?? '').trim().slice(0, 5000) || null,
    type: mapBoatType(b.type),
    length_m: Number(b.length_m) > 0 ? Number(b.length_m) : null,
    capacity_pax: Math.min(200, Math.max(1, Math.round(Number(b.capacity_pax) || 8))),
    cabins: Number(b.cabins) > 0 ? Math.round(Number(b.cabins)) : null,
    builder: String(b.builder ?? '').trim().slice(0, 80) || null,
    model_year: Number(b.model_year) >= 1950 && Number(b.model_year) <= 2030 ? Math.round(Number(b.model_year)) : null,
    departure_port: String(b.departure_port ?? '').trim().slice(0, 120) || null,
    min_hours: pricing.length ? Math.min(...pricing.map((p: any) => p.duration_hours)) : 2,
    pricing_type: 'hourly',
    instant_book: false,
    cancellation_policy: 'flexible',
    status,
    submission_id: submissionId,
    updated_at: new Date().toISOString(),
  }

  // Re-import of the same-named boat for this host updates instead of duplicating.
  const { data: existing } = await admin
    .from('boats').select('id')
    .eq('host_id', hostId).eq('name', name)
    .maybeSingle()

  let boatId = (existing as { id: string } | null)?.id
  let updated = false
  if (boatId) {
    await admin.from('boats').update(row).eq('id', boatId)
    await admin.from('boat_images').delete().eq('boat_id', boatId)
    await admin.from('boat_pricing').delete().eq('boat_id', boatId)
    await admin.from('boat_features').delete().eq('boat_id', boatId)
    updated = true
  } else {
    row.slug = await uniqueBoatSlug(
      buildBoatSlug({ city, builder: row.builder, name }),
      async (c) => !!(await admin.from('boats').select('id').eq('slug', c).maybeSingle()).data,
    )
    const { data: ins, error } = await admin.from('boats').insert(row).select('id').single()
    if (error || !ins) return NextResponse.json({ error: error?.message ?? 'Could not create the listing' }, { status: 500 })
    boatId = (ins as { id: string }).id
  }

  if (pricing.length) {
    await admin.from('boat_pricing').insert(pricing.map((p: any) => ({ boat_id: boatId, duration_hours: p.duration_hours, price: p.price, currency })))
  }
  const features = (Array.isArray(b.features) ? b.features : []).map((f: any) => String(f).trim().slice(0, 60)).filter(Boolean).slice(0, 15)
  if (features.length) {
    await admin.from('boat_features').insert(features.map((f: string) => ({ boat_id: boatId, feature: f })))
  }

  const imageUrls: string[] = (Array.isArray(b.images) ? b.images : [])
    .filter((u: any) => typeof u === 'string' && /^https?:\/\//.test(u))
    .slice(0, 8)
  let stored = 0
  const finals: string[] = []
  for (let i = 0; i < imageUrls.length; i++) {
    const final = await rehostImage(imageUrls[i], boatId!, i)
    if (final !== imageUrls[i]) stored++
    finals.push(final)
  }
  if (finals.length) {
    await admin.from('boat_images').insert(finals.map((url, i) => ({ boat_id: boatId, storage_url: url, alt: name, sort_order: i, is_hero: i === 0 })))
  }

  const { data: created } = await admin.from('boats').select('slug').eq('id', boatId).single()
  return NextResponse.json({
    ok: true, boatId, updated,
    slug: (created as { slug: string } | null)?.slug ?? null,
    images: finals.length, imagesRehosted: stored,
  })
}
