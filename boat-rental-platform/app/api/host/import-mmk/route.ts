import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { mmkListYachts, mmkToBoatRow, mmkImages, type MMKYacht } from '@/lib/import/mmk'
import { buildBoatSlug, uniqueBoatSlug } from '@/lib/slug'

export const runtime = 'nodejs'
export const maxDuration = 300

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// MMK Booking Manager fleet sync. Body:
//   { apiKey, companyId?, locationId?, city?, country?, status?, targetHostId?, submissionId? }
// Re-sync friendly: yachts are upserted by external_id `mmk:<id>` for this host.
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const apiKey = String(body?.apiKey ?? '').trim()
  const companyId = String(body?.companyId ?? '').trim()
  if (!apiKey) return NextResponse.json({ error: 'MMK API key is required' }, { status: 400 })

  // Admin concierge: import on behalf of another host (managed model).
  let hostId = user.id
  const targetHostId = String(body?.targetHostId ?? '').trim()
  if (targetHostId && targetHostId !== user.id) {
    const { data: me } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!(me as { is_admin?: boolean } | null)?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    hostId = targetHostId
  }
  const submissionId = String(body?.submissionId ?? '').trim() || null
  const status = body?.status === 'draft' ? 'draft' : 'active'

  // Location: explicit id, or find-or-create by city/country.
  let locationId = String(body?.locationId ?? '').trim() || null
  const city = String(body?.city ?? '').trim().slice(0, 80)
  const country = String(body?.country ?? '').trim().slice(0, 80)
  if (!locationId && city) {
    const { data: found } = await admin.from('locations').select('id').ilike('city', city).ilike('country', country || '%').limit(1)
    const hit = (found as { id: string }[] | null)?.[0]
    if (hit) locationId = hit.id
    else {
      const { data: ins, error } = await admin.from('locations')
        .insert({ slug: `${city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`, name: city, city, country: country || 'Unknown', country_code: 'HR', lat: 0, lng: 0 })
        .select('id').single()
      if (error || !ins) return NextResponse.json({ error: error?.message ?? 'Could not create location' }, { status: 500 })
      locationId = (ins as { id: string }).id
    }
  }
  if (!locationId) return NextResponse.json({ error: 'Pick a location (or type city + country) for the imported fleet' }, { status: 400 })

  let yachts: MMKYacht[]
  try {
    yachts = await mmkListYachts(apiKey, companyId || undefined)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 200 })
  }
  if (!yachts.length) return NextResponse.json({ error: 'MMK returned no yachts for this key/company. Check the Company ID.', imported: 0 }, { status: 200 })

  const { data: existing } = await admin.from('boats').select('id, external_id').eq('host_id', hostId).eq('external_source', 'booking-manager.com')
  const byExt = new Map(((existing ?? []) as { id: string; external_id: string }[]).map((b) => [b.external_id, b.id]))

  let imported = 0, updated = 0, photos = 0
  for (const y of yachts.slice(0, 300)) {
    const mapped = mmkToBoatRow(y)
    const row: Record<string, unknown> = {
      ...mapped, host_id: hostId, location_id: locationId, status,
      ...(submissionId ? { submission_id: submissionId } : {}), updated_at: new Date().toISOString(),
    }
    let boatId = byExt.get(mapped.external_id)
    if (boatId) {
      await admin.from('boats').update(row).eq('id', boatId)
      await admin.from('boat_images').delete().eq('boat_id', boatId)
      updated++
    } else {
      row.slug = await uniqueBoatSlug(
        buildBoatSlug({ city, builder: mapped.builder, name: mapped.name }),
        async (c) => !!(await admin.from('boats').select('id').eq('slug', c).maybeSingle()).data,
      )
      const { data: ins, error } = await admin.from('boats').insert(row).select('id').single()
      if (error || !ins) continue
      boatId = (ins as { id: string }).id
      byExt.set(mapped.external_id, boatId)
      imported++
    }
    // Photos: hotlink MMK URLs (their CDN is stable); first is hero.
    const imgs = mmkImages(y.images)
    if (imgs.length) {
      await admin.from('boat_images').insert(imgs.map((url, i) => ({ boat_id: boatId, storage_url: url, alt: mapped.name, sort_order: i, is_hero: i === 0 })))
      photos += imgs.length
    }
  }

  return NextResponse.json({ ok: true, yachts: yachts.length, imported, updated, photos })
}
