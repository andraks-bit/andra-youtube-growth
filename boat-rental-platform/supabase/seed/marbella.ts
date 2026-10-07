/**
 * Marbella fleet seed script.
 * Run: npx ts-node --esm supabase/seed/marbella.ts
 * (Or copy the data and insert via Supabase dashboard)
 *
 * Reads /Users/master/boat-rental-marbella/config/boats.json
 * and imports the full fleet into the new platform database.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { BoatType } from '../../types/database'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const OPERATOR_EMAIL = 'hello@boatrentalinmarbella.com'

// Intentionally untyped to avoid inference issues with manual schema
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const boatsJson = JSON.parse(
  readFileSync(join(__dirname, '../../../boat-rental-marbella/config/boats.json'), 'utf-8')
)

const TIER_TO_PRICING: Record<string, { hours: number; price: number }[]> = {
  tier_a: [
    { hours: 2, price: 749 },
    { hours: 3, price: 1049 },
    { hours: 4, price: 1299 },
    { hours: 5, price: 1549 },
    { hours: 6, price: 1799 },
    { hours: 7, price: 2099 },
    { hours: 8, price: 2299 },
  ],
  tier_b: [{ hours: 4, price: 4719 }],
  entry: [
    { hours: 2, price: 230 },
    { hours: 3, price: 280 },
    { hours: 4, price: 350 },
  ],
  on_request: [],
}

const BOAT_TYPE_MAP: Record<string, BoatType> = {
  'Motor yacht': 'motor_yacht',
  'Catamaran': 'catamaran',
  'Sailing yacht': 'sailing',
  'Speedboat': 'speedboat',
  'Sport-fishing': 'fishing',
  'RIB': 'rib',
  'Superyacht': 'luxury',
}

async function seed() {
  console.log('🌊 Seeding Marbella fleet...')

  // 1. Create or get Marbella location
  const { data: existingLoc } = await supabase
    .from('locations')
    .select('id')
    .eq('slug', 'marbella')
    .maybeSingle()

  let locationId: string
  if (existingLoc) {
    locationId = existingLoc.id
    console.log('✓ Location already exists:', locationId)
  } else {
    const { data: loc, error } = await supabase
      .from('locations')
      .insert({
        slug: 'marbella',
        name: 'Marbella',
        city: 'Marbella',
        country: 'Spain',
        country_code: 'ES',
        lat: 36.5108,
        lng: -4.885,
        description: 'Charter yachts, catamarans, and speedboats from Puerto Banús and Marbella Marina on the Costa del Sol.',
        image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80',
        is_featured: true,
      })
      .select('id')
      .single()
    if (error) throw error
    locationId = loc.id
    console.log('✓ Created location:', locationId)
  }

  // 2. Get or create operator user
  const { data: { users } } = await supabase.auth.admin.listUsers()
  let operatorId = users.find((u) => u.email === OPERATOR_EMAIL)?.id

  if (!operatorId) {
    const { data: { user }, error } = await supabase.auth.admin.createUser({
      email: OPERATOR_EMAIL,
      password: 'change-me-immediately',
      email_confirm: true,
      user_metadata: { full_name: 'Boat Rental Marbella' },
    })
    if (error) throw error
    operatorId = user!.id
    console.log('✓ Created operator user:', operatorId)
  } else {
    console.log('✓ Operator user exists:', operatorId)
  }

  // 3. Import each boat
  const SHARED_INCLUSIONS = boatsJson.shared_inclusions as string[]

  for (const boat of boatsJson.boats) {
    const { data: existing } = await supabase
      .from('boats')
      .select('id')
      .eq('slug', boat.slug)
      .maybeSingle()

    if (existing) {
      console.log(`  ↳ Already exists: ${boat.name}`)
      continue
    }

    const boatType = BOAT_TYPE_MAP[boat.type] ?? 'motor_yacht'
    const pricingSlots = TIER_TO_PRICING[boat.tier] ?? []

    const { data: newBoat, error: boatErr } = await supabase
      .from('boats')
      .insert({
        host_id: operatorId,
        location_id: locationId,
        slug: boat.slug,
        name: boat.name,
        tagline: boat.tagline,
        description: boat.summary ?? null,
        type: boatType,
        length_m: boat.length_m ?? null,
        capacity_pax: boat.capacity_pax ?? 8,
        builder: boat.builder ?? null,
        model_year: boat.model_year ?? null,
        departure_port: boat.departure_port ?? 'Puerto Banús',
        marina_lat: 36.4878,
        marina_lng: -4.9607,
        includes_skipper: true,
        includes_fuel: boat.tier !== 'entry',
        includes_drinks: true,
        min_hours: 2,
        pricing_type: 'hourly',
        instant_book: false,
        cancellation_policy: 'moderate',
        status: pricingSlots.length > 0 ? 'active' : 'draft',
      })
      .select('id')
      .single()

    if (boatErr || !newBoat) {
      console.error(`  ✗ Failed to insert ${boat.name}:`, boatErr?.message)
      continue
    }

    // Pricing
    if (pricingSlots.length > 0) {
      await supabase.from('boat_pricing').insert(
        pricingSlots.map((p) => ({
          boat_id: newBoat.id,
          duration_hours: p.hours,
          price: p.price,
          currency: 'EUR',
          season: 'all' as const,
        }))
      )
    }

    // Features (shared inclusions + highlights)
    const features = [
      ...SHARED_INCLUSIONS,
      ...(boat.highlights ?? []),
    ]
    if (features.length > 0) {
      await supabase.from('boat_features').insert(
        features.map((f: string) => ({ boat_id: newBoat.id, feature: f }))
      )
    }

    // Images — use local path from site/img/ folder (will need serving from /public or storage upload)
    if (boat.hero_local) {
      await supabase.from('boat_images').insert({
        boat_id: newBoat.id,
        storage_url: `https://boatrentalinmarbella.com${boat.hero_local}`,
        alt: `${boat.name} — ${boat.tagline ?? ''}`,
        sort_order: 0,
        is_hero: true,
      })
    }

    if (boat.gallery_local && Array.isArray(boat.gallery_local)) {
      await supabase.from('boat_images').insert(
        boat.gallery_local.slice(0, 8).map((img: any, idx: number) => ({
          boat_id: newBoat.id,
          storage_url: `https://boatrentalinmarbella.com${img.src ?? img}`,
          alt: img.alt ?? `${boat.name} photo ${idx + 2}`,
          sort_order: idx + 1,
          is_hero: false,
        }))
      )
    }

    console.log(`  ✓ Imported: ${boat.name} (${boatType}, ${pricingSlots.length} pricing slots)`)
  }

  console.log('\n✅ Marbella seed complete!')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
