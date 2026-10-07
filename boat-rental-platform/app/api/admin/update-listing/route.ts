import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Admin concierge: update an existing boat (any host) + replace its pricing,
// features and append images — via the service role, so RLS doesn't silently
// drop edits to boats the admin doesn't own.
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: me } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!(me as { is_admin?: boolean } | null)?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const boatId = String(body?.boatId ?? '').trim()
  if (!boatId) return NextResponse.json({ error: 'boatId is required' }, { status: 400 })

  const fields = (body?.fields ?? {}) as Record<string, unknown>
  // Whitelist updatable boat columns.
  const allowed = ['location_id', 'name', 'tagline', 'description', 'type', 'length_m', 'capacity_pax',
    'cabins', 'builder', 'model_year', 'departure_port', 'includes_skipper', 'includes_fuel',
    'includes_drinks', 'min_hours', 'pricing_type', 'instant_book', 'cancellation_policy', 'is_fishing_trip', 'is_boat_tour']
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const k of allowed) if (k in fields) update[k] = fields[k]

  const { error: upErr } = await admin.from('boats').update(update).eq('id', boatId)
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  // Replace pricing
  await admin.from('boat_pricing').delete().eq('boat_id', boatId)
  const pricing = (Array.isArray(body?.pricing) ? body.pricing : [])
    .map((p: { duration_hours: number; price: number; currency?: string; season?: string }) => ({
      boat_id: boatId, duration_hours: Math.round(Number(p.duration_hours)), price: Math.round(Number(p.price)),
      currency: p.currency || 'EUR', season: p.season || 'all',
    }))
    .filter((p: { duration_hours: number; price: number }) => p.duration_hours > 0 && p.price > 0)
  if (pricing.length) await admin.from('boat_pricing').insert(pricing)

  // Replace features (plain strings; includes the refund-policy marker row)
  await admin.from('boat_features').delete().eq('boat_id', boatId)
  const features = (Array.isArray(body?.features) ? body.features : [])
    .map((f: unknown) => String(f).trim()).filter(Boolean).slice(0, 40)
    .map((feature: string) => ({ boat_id: boatId, feature }))
  if (features.length) await admin.from('boat_features').insert(features)

  // Append any newly uploaded images
  const newImages = (Array.isArray(body?.newImages) ? body.newImages : [])
    .filter((i: { storage_url?: string }) => i?.storage_url)
    .map((i: { storage_url: string; alt?: string; sort_order?: number; is_hero?: boolean }) => ({
      boat_id: boatId, storage_url: i.storage_url, alt: i.alt ?? null, sort_order: i.sort_order ?? 0, is_hero: !!i.is_hero,
    }))
  if (newImages.length) await admin.from('boat_images').insert(newImages)

  return NextResponse.json({ ok: true })
}
