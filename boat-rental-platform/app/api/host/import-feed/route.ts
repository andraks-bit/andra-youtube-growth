import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { buildBoatSlug, uniqueBoatSlug } from '@/lib/slug'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const BOAT_TYPES = ['motor_yacht', 'catamaran', 'sailing', 'speedboat', 'fishing', 'rib', 'luxury', 'jet_ski', 'jet_car', 'gulet']
function mapType(raw: unknown): string {
  const t = String(raw ?? '').toLowerCase().replace(/[\s-]+/g, '_')
  if (BOAT_TYPES.includes(t)) return t
  if (/(motor|fly|power).*yacht|^yacht$|motorboat|cruiser/.test(t)) return 'motor_yacht'
  if (/catamaran|cat\b/.test(t)) return 'catamaran'
  if (/sail/.test(t)) return 'sailing'
  if (/speed|sport|bowrider|day_?boat/.test(t)) return 'speedboat'
  if (/fish/.test(t)) return 'fishing'
  if (/rib|inflatable|zodiac/.test(t)) return 'rib'
  if (/luxury|super_?yacht|mega/.test(t)) return 'luxury'
  if (/jet_?ski|wave|moto/.test(t)) return 'jet_ski'
  if (/jet_?car/.test(t)) return 'jet_car'
  return 'motor_yacht'
}
const num = (v: unknown, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d }
const str = (v: unknown) => (v == null ? '' : String(v)).trim()
const pick = (o: any, ...keys: string[]) => { for (const k of keys) if (o?.[k] != null && o[k] !== '') return o[k]; return undefined }
function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

// Normalise a feed boat (flexible field aliases) into our shape.
function normalize(b: any) {
  const name = str(pick(b, 'name', 'title', 'boat_name')) || 'Untitled boat'
  const externalId = str(pick(b, 'external_id', 'id', 'sku', 'reference', 'ref')) || slugify(name)
  // pricing → [{duration_hours, price}]
  let pricing: { duration_hours: number; price: number; currency: string }[] = []
  const currency = str(pick(b, 'currency')) || 'EUR'
  const rawPricing = pick(b, 'pricing', 'prices', 'price_tiers', 'rates')
  if (Array.isArray(rawPricing)) {
    pricing = rawPricing.map((p: any) => ({
      duration_hours: num(pick(p, 'duration_hours', 'hours', 'duration'), 0),
      price: Math.round(num(pick(p, 'price', 'amount', 'value'))),
      currency: str(pick(p, 'currency')) || currency,
    })).filter((p) => p.duration_hours > 0 && p.price > 0)
  }
  if (pricing.length === 0) {
    const hourly = num(pick(b, 'hourly_price', 'price_per_hour', 'price_hour'))
    const daily = num(pick(b, 'daily_price', 'price_per_day', 'day_price'))
    if (hourly > 0) for (const h of [2, 4, 8]) pricing.push({ duration_hours: h, price: Math.round(hourly * h), currency })
    else if (daily > 0) pricing.push({ duration_hours: 24, price: Math.round(daily), currency })
  }
  // images → [url]
  let images: string[] = []
  const rawImgs = pick(b, 'images', 'photos', 'gallery', 'pictures')
  if (Array.isArray(rawImgs)) images = rawImgs.map((x: any) => (typeof x === 'string' ? x : str(pick(x, 'url', 'src', 'href')))).filter((u: string) => /^https?:\/\//.test(u))
  const hero = str(pick(b, 'image', 'hero', 'thumbnail', 'cover'))
  if (hero && /^https?:\/\//.test(hero)) images = [hero, ...images.filter((u) => u !== hero)]
  // features
  let features: string[] = []
  const rawF = pick(b, 'features', 'amenities', 'highlights', 'inclusions')
  if (Array.isArray(rawF)) features = rawF.map((x: any) => str(typeof x === 'string' ? x : pick(x, 'name', 'label'))).filter(Boolean)

  return {
    externalId,
    name,
    tagline: str(pick(b, 'tagline', 'subtitle', 'short_description')).slice(0, 200),
    description: str(pick(b, 'description', 'summary', 'desc', 'about')),
    type: mapType(pick(b, 'type', 'boat_type', 'category')),
    length_m: num(pick(b, 'length_m', 'length', 'loa', 'length_meters')) || null,
    capacity_pax: Math.max(1, Math.round(num(pick(b, 'capacity_pax', 'capacity', 'guests', 'max_guests', 'pax'), 1))),
    builder: str(pick(b, 'builder', 'manufacturer', 'make')) || null,
    model_year: num(pick(b, 'model_year', 'year', 'build_year')) || null,
    departure_port: str(pick(b, 'departure_port', 'port', 'marina', 'base', 'location_name')) || null,
    min_hours: Math.max(1, Math.round(num(pick(b, 'min_hours', 'minimum_hours'), pricing[0]?.duration_hours || 2))),
    instant_book: !!pick(b, 'instant_book', 'instant'),
    pricing,
    images,
    features,
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null) as
    | { feedUrl?: string; authHeader?: string; authValue?: string; defaultLocationId?: string; defaultStatus?: string }
    | null
  const feedUrl = str(body?.feedUrl)
  if (!/^https?:\/\//.test(feedUrl)) return NextResponse.json({ error: 'Enter a valid feed URL (https://…).' }, { status: 400 })
  const defaultStatus = body?.defaultStatus === 'draft' ? 'draft' : 'active'
  const locationId = str(body?.defaultLocationId) || null

  // Save the feed config on the host profile (so re-sync just reuses it).
  await admin.from('profiles').update({
    feed_url: feedUrl, feed_auth_header: str(body?.authHeader) || null, feed_auth_value: str(body?.authValue) || null,
    feed_default_location_id: locationId, feed_default_status: defaultStatus,
  }).eq('id', user.id).then(() => {}, () => {})

  // Fetch the external feed.
  let feedJson: any
  try {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (body?.authHeader && body?.authValue) headers[str(body.authHeader)] = str(body.authValue)
    const res = await fetch(feedUrl, { headers, signal: AbortSignal.timeout(20000) })
    if (!res.ok) return NextResponse.json({ error: `Feed returned HTTP ${res.status}. Check the URL and key.` }, { status: 400 })
    feedJson = await res.json()
  } catch (e: any) {
    return NextResponse.json({ error: `Could not reach the feed: ${e?.message ?? 'network error'}` }, { status: 400 })
  }

  const list: any[] = Array.isArray(feedJson) ? feedJson
    : Array.isArray(feedJson?.boats) ? feedJson.boats
    : Array.isArray(feedJson?.data) ? feedJson.data
    : Array.isArray(feedJson?.listings) ? feedJson.listings
    : Array.isArray(feedJson?.results) ? feedJson.results : []
  if (list.length === 0) return NextResponse.json({ error: 'No boats found in the feed. Expecting {"boats":[…]} or an array.' }, { status: 400 })

  // Existing imported boats for this host (dedupe by external_id).
  const { data: existing } = await admin.from('boats').select('id, external_id').eq('host_id', user.id).not('external_id', 'is', null)
  const byExt = new Map((existing ?? []).map((b: any) => [b.external_id, b.id]))

  let imported = 0, updated = 0, errors = 0
  const errorList: string[] = []
  const source = new URL(feedUrl).host
  // City for keyword-rich slugs (feed shares one default location).
  const feedCity = locationId
    ? ((await admin.from('locations').select('city').eq('id', locationId).maybeSingle()).data as { city?: string } | null)?.city ?? null
    : null

  for (const raw of list.slice(0, 200)) {
    try {
      const b = normalize(raw)
      const row: any = {
        host_id: user.id, location_id: locationId, external_id: b.externalId, external_source: source,
        name: b.name, tagline: b.tagline, description: b.description, type: b.type,
        length_m: b.length_m, capacity_pax: b.capacity_pax, builder: b.builder, model_year: b.model_year,
        departure_port: b.departure_port, min_hours: b.min_hours, pricing_type: 'hourly',
        instant_book: b.instant_book, cancellation_policy: 'flexible', status: defaultStatus, updated_at: new Date().toISOString(),
      }
      let boatId = byExt.get(b.externalId)
      if (boatId) {
        await admin.from('boats').update(row).eq('id', boatId)
        await admin.from('boat_images').delete().eq('boat_id', boatId)
        await admin.from('boat_pricing').delete().eq('boat_id', boatId)
        updated++
      } else {
        row.slug = await uniqueBoatSlug(
          buildBoatSlug({ city: feedCity, builder: b.builder, name: b.name }),
          async (c) => !!(await admin.from('boats').select('id').eq('slug', c).maybeSingle()).data,
        )
        const { data: ins, error } = await admin.from('boats').insert(row).select('id').single()
        if (error || !ins) { errors++; errorList.push(`${b.name}: ${error?.message ?? 'insert failed'}`); continue }
        boatId = ins.id
        byExt.set(b.externalId, boatId)
        imported++
      }
      if (b.images.length) await admin.from('boat_images').insert(b.images.slice(0, 12).map((url, i) => ({ boat_id: boatId, storage_url: url, alt: b.name, sort_order: i, is_hero: i === 0 })))
      if (b.pricing.length) await admin.from('boat_pricing').insert(b.pricing.map((p) => ({ boat_id: boatId, duration_hours: p.duration_hours, price: p.price, currency: p.currency })))
      if (b.features.length) await admin.from('boat_features').insert(b.features.slice(0, 30).map((f) => ({ boat_id: boatId, feature: f })))
    } catch (e: any) { errors++; errorList.push(e?.message ?? 'error') }
  }

  await admin.from('profiles').update({
    feed_last_synced_at: new Date().toISOString(),
    feed_last_status: `${imported} new, ${updated} updated${errors ? `, ${errors} errors` : ''}`,
    feed_imported_count: imported + updated,
  }).eq('id', user.id)

  return NextResponse.json({ ok: true, found: list.length, imported, updated, errors, errorSample: errorList.slice(0, 5) })
}

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await admin.from('profiles').select('feed_url, feed_auth_header, feed_default_location_id, feed_default_status, feed_last_synced_at, feed_last_status, feed_imported_count').eq('id', user.id).maybeSingle()
  const feed = data?.feed_url ? {
    feed_url: data.feed_url, auth_header: data.feed_auth_header, default_location_id: data.feed_default_location_id,
    default_status: data.feed_default_status, last_synced_at: data.feed_last_synced_at, last_status: data.feed_last_status, imported_count: data.feed_imported_count,
  } : null
  return NextResponse.json({ feed })
}
