#!/usr/bin/env node
// One-off: add RentBoat Stockholm's 3 boats (Silvia, Evelyn, Paula) as DRAFTS
// under the managed BoatHire24 account, linked to the rentboat-stockholm.com
// lead, with ALL their photos rehosted onto BoatHire24 storage.
// Data extracted from the site's JS bundle + JSON-LD (6,200 SEK / 3h up to 5
// guests, +700 SEK per extra guest, captain included, Klara mälarstrand).
//   node scripts/import-rentboat-stockholm.mjs           # dry run
//   node scripts/import-rentboat-stockholm.mjs --apply
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY
const APPLY = process.argv.includes('--apply')
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const JH = { ...H, 'Content-Type': 'application/json' }

const SITE = 'https://rentboat-stockholm.com'
const HOST = '72a6589c-d677-4720-b4c2-d1c69062c286'        // BoatHire24 managed account
const SUBMISSION = 'cc937232-216f-418a-89c8-c3ec9341517c'  // rentboat-stockholm.com lead
const LOCATION = '61649773-7c91-4604-b3e1-a90547cfc93e'    // Stockholm, Sweden

const PRICE_NOTE = 'Up to 5 guests included in the base price; +700 SEK per additional guest. Private English-speaking captain and fuel included.'

const BOATS = [
  {
    name: 'Silvia', type: 'motor_yacht', capacity_pax: 12,
    tagline: 'Luxurious Stockholm lounge boat for groups up to 12',
    description: `Luxurious Stockholm lounge boat for groups up to 12 people. Experience Lake Mälaren in comfort with panoramic views of Stockholm's waterways, departing from Klara mälarstrand in the heart of the city. ${PRICE_NOTE}`,
    images: ['silvia-boat-1-DMKR34oG.jpg', 'silvia-boat-2-CWDQyaNR.jpg', 'silvia-boat-3-DFByx7_v.jpg', 'silvia-boat-4-DBMIiKL5.jpg', 'silvia-boat-5-B5mOuub1.jpg'],
  },
  {
    name: 'Evelyn', type: 'speedboat', capacity_pax: 10,
    tagline: 'Luxury boat for Lake Mälaren tours with groups up to 10',
    description: `Luxury boat perfect for Lake Mälaren tours with groups up to 10 people. Ideal for tourists exploring Stockholm's beautiful lake and islands, departing from Klara mälarstrand. ${PRICE_NOTE}`,
    images: ['evelyn-boat-D1r2EMwD.jpg'],
  },
  {
    name: 'Paula', type: 'speedboat', capacity_pax: 12,
    tagline: 'Premium Stockholm boat rental for groups up to 12',
    description: `Premium Stockholm boat rental for groups up to 12 people. Perfect for sightseeing tours of Lake Mälaren's beautiful waters and islands, departing from Klara mälarstrand. ${PRICE_NOTE}`,
    images: ['paula-boat-D8Oes25L.jpg'],
  },
]

console.log('Plan:')
for (const b of BOATS) console.log(`  ${b.name}: ${b.type}, ${b.capacity_pax}pax, ${b.images.length} photos, 3h = 6200 SEK`)
if (!APPLY) { console.log('\nDry run. Re-run with --apply to create.'); process.exit(0) }

const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

// Fill the lead's contact details if blank.
await fetch(`${SB}/rest/v1/listing_submissions?id=eq.${SUBMISSION}`, {
  method: 'PATCH', headers: { ...JH, Prefer: 'return=minimal' },
  body: JSON.stringify({ contact_name: 'RentBoat Stockholm', email: 'info@rentboat.nu', phone: '+46738776775', country: 'Sweden', port: 'Klara mälarstrand, Stockholm' }),
})

for (const b of BOATS) {
  const base = `stockholm-${slugify(b.name)}`
  let slug = base
  for (let n = 1; n <= 10; n++) {
    slug = n === 1 ? base : `${base}-${n}`
    if (!(await (await fetch(`${SB}/rest/v1/boats?slug=eq.${slug}&select=id`, { headers: H })).json()).length) break
  }
  const row = {
    host_id: HOST, location_id: LOCATION, submission_id: SUBMISSION, name: b.name, slug, status: 'draft',
    tagline: b.tagline, description: b.description, type: b.type, capacity_pax: b.capacity_pax,
    departure_port: 'Klara mälarstrand', min_hours: 3, pricing_type: 'hourly',
    includes_skipper: true, includes_fuel: true, instant_book: false, cancellation_policy: 'flexible',
    updated_at: new Date().toISOString(),
  }
  const ins = await fetch(`${SB}/rest/v1/boats`, { method: 'POST', headers: { ...JH, Prefer: 'return=representation' }, body: JSON.stringify(row) })
  if (!ins.ok) { console.error('FAIL', b.name, await ins.text()); continue }
  const boatId = (await ins.json())[0].id

  await fetch(`${SB}/rest/v1/boat_pricing`, { method: 'POST', headers: JH, body: JSON.stringify([{ boat_id: boatId, duration_hours: 3, price: 6200, currency: 'SEK' }]) })
  await fetch(`${SB}/rest/v1/boat_features`, { method: 'POST', headers: JH, body: JSON.stringify(
    ['Private captain included', 'Fuel included', 'Departs Klara mälarstrand', '+700 SEK per extra guest (5 included)'].map((f) => ({ boat_id: boatId, feature: f })),
  ) })

  // Rehost every photo onto BoatHire24 storage.
  const finals = []
  for (let i = 0; i < b.images.length; i++) {
    try {
      const resp = await fetch(`${SITE}/assets/${b.images[i]}`, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      if (!resp.ok) { console.error('  img dl fail', b.images[i], resp.status); continue }
      const bytes = Buffer.from(await resp.arrayBuffer())
      const path = `rentboat/${boatId}/${i}.jpg`
      const up = await fetch(`${SB}/storage/v1/object/boat-images/${path}`, { method: 'POST', headers: { ...H, 'Content-Type': 'image/jpeg', 'x-upsert': 'true' }, body: bytes })
      if (up.ok) finals.push(`${SB}/storage/v1/object/public/boat-images/${path}`)
      else console.error('  img up fail', path, await up.text())
    } catch (e) { console.error('  img err', b.images[i], e.message) }
  }
  if (finals.length) {
    await fetch(`${SB}/rest/v1/boat_images`, { method: 'POST', headers: JH, body: JSON.stringify(
      finals.map((u, i) => ({ boat_id: boatId, storage_url: u, alt: `${b.name} — boat tour Stockholm`, sort_order: i, is_hero: i === 0 })),
    ) })
  }
  console.log(`  ✓ ${b.name} (${slug}) — draft, ${finals.length}/${b.images.length} photos rehosted, 3h 6200 SEK`)
}
console.log('\nDone.')
