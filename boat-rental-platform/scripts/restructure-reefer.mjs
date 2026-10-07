#!/usr/bin/env node
// Reefer Sport Fishing (info@reefer-fishing.com) — split the host's single
// 3-boats-in-one listing into three proper listings, per his email:
//   Reefer Boat    — Sea Hunt Triton 20ft · 3 anglers · Hurghada Marina    · €600/day · €2,750/5d
//   Reefer X Boat  — Wahoo EFS 26ft      · 4 anglers · Abydos Marina, El Gouna · €700/day · €3,250/5d
//   Reefer XL Boat — VIGA Ultra 30ft     · 5 anglers · Somabay Marina, Safaga  · €900/day · €4,250/5d
// Day trips 07:00–16:00 (9h), incl. drinks, snacks, boat, professional guiding.
//   node scripts/restructure-reefer.mjs           # dry run
//   node scripts/restructure-reefer.mjs --apply
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY
const APPLY = process.argv.includes('--apply')
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const JH = { ...H, 'Content-Type': 'application/json' }

const HOST = '6928d585-1af3-4320-bf8c-048bd5072bce'      // info@reefer-fishing.com
const EXISTING = 'c3dbb3cf-564a-444e-9678-eaaf8c18e0b6'  // his current all-in-one listing
const HURGHADA = '8dff679b-fc12-42e9-a038-59575faccbf1'

const DESC = (boat, marina) => `${boat} runs daily deep-sea fishing trips from ${marina} on the Red Sea. Trips run from 07:00 to 16:00 and include complimentary drinks and snacks, the boat, and professional guiding services. Multi-day packages (1 to 5 days) are available for serious anglers.`

async function findOrCreateLocation(city, slugBase, lat, lng) {
  const q = await (await fetch(`${SB}/rest/v1/locations?select=id&city=ilike.${encodeURIComponent(city)}&country=eq.Egypt&limit=1`, { headers: H })).json()
  if (q.length) return q[0].id
  const ins = await fetch(`${SB}/rest/v1/locations`, {
    method: 'POST', headers: { ...JH, Prefer: 'return=representation' },
    body: JSON.stringify({ slug: slugBase, name: city, city, country: 'Egypt', country_code: 'EG', lat, lng }),
  })
  if (!ins.ok) throw new Error(`location ${city}: ${await ins.text()}`)
  return (await ins.json())[0].id
}

console.log(APPLY ? 'Applying…' : 'Dry run (use --apply to write).')
if (!APPLY) process.exit(0)

const elGouna = await findOrCreateLocation('El Gouna', 'el-gouna', 27.394, 33.678)
const safaga = await findOrCreateLocation('Safaga', 'safaga', 26.729, 33.936)
console.log('locations:', { elGouna, safaga })

// 1) Existing listing becomes "Reefer Boat" (keeps his 9 photos + slug).
const upd = await fetch(`${SB}/rest/v1/boats?id=eq.${EXISTING}`, {
  method: 'PATCH', headers: { ...JH, Prefer: 'return=minimal' },
  body: JSON.stringify({
    name: 'Reefer Boat', tagline: 'Sea Hunt Triton 20ft — daily fishing trips from Hurghada Marina',
    description: DESC('Reefer Boat, a Sea Hunt Triton 20ft,', 'Hurghada Marina'),
    type: 'fishing', is_fishing_trip: true, capacity_pax: 3, length_m: 6.1,
    location_id: HURGHADA, departure_port: 'Hurghada Marina', min_hours: 9,
    includes_skipper: true, includes_drinks: true, updated_at: new Date().toISOString(),
  }),
})
if (!upd.ok) { console.error('update existing failed:', await upd.text()); process.exit(1) }
await fetch(`${SB}/rest/v1/boat_pricing?boat_id=eq.${EXISTING}`, { method: 'DELETE', headers: JH })
await fetch(`${SB}/rest/v1/boat_pricing`, { method: 'POST', headers: JH, body: JSON.stringify([
  { boat_id: EXISTING, duration_hours: 9, price: 600, currency: 'EUR' },
  { boat_id: EXISTING, duration_hours: 120, price: 2750, currency: 'EUR' },
]) })
console.log('✓ existing listing → Reefer Boat (Hurghada, 3 anglers, €600/day, €2750/5d, fishing)')

// 2) The two missing boats — drafts (no photos yet; host adds photos & publishes).
const NEW = [
  { name: 'Reefer X Boat', model: 'Wahoo EFS 26ft', cap: 4, len: 7.9, loc: elGouna, port: 'Abydos Marina, El Gouna', day: 700, five: 3250, slug: 'el-gouna-reefer-x-boat' },
  { name: 'Reefer XL Boat', model: 'VIGA Ultra 30ft', cap: 5, len: 9.1, loc: safaga, port: 'Somabay Marina, Safaga', day: 900, five: 4250, slug: 'safaga-reefer-xl-boat' },
]
for (const b of NEW) {
  const ins = await fetch(`${SB}/rest/v1/boats`, {
    method: 'POST', headers: { ...JH, Prefer: 'return=representation' },
    body: JSON.stringify({
      host_id: HOST, location_id: b.loc, name: b.name, slug: b.slug, status: 'draft',
      tagline: `${b.model} — daily fishing trips from ${b.port}`,
      description: DESC(`${b.name}, a ${b.model},`, b.port),
      type: 'fishing', is_fishing_trip: true, capacity_pax: b.cap, length_m: b.len,
      departure_port: b.port, min_hours: 9, pricing_type: 'hourly',
      includes_skipper: true, includes_drinks: true, instant_book: false,
      cancellation_policy: 'flexible', updated_at: new Date().toISOString(),
    }),
  })
  if (!ins.ok) { console.error(`${b.name} failed:`, await ins.text()); continue }
  const id = (await ins.json())[0].id
  await fetch(`${SB}/rest/v1/boat_pricing`, { method: 'POST', headers: JH, body: JSON.stringify([
    { boat_id: id, duration_hours: 9, price: b.day, currency: 'EUR' },
    { boat_id: id, duration_hours: 120, price: b.five, currency: 'EUR' },
  ]) })
  console.log(`✓ created ${b.name} (draft, ${b.port}, €${b.day}/day, €${b.five}/5d)`)
}
console.log('Done.')
