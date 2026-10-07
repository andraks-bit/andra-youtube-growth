#!/usr/bin/env node
// Gold Coast Luxury Boat Charters (Janine Wright) — add the fleet from the two
// listing pages as DRAFTS under the managed account. Site blocks direct fetches
// (SiteGround captcha) so photos come via the WordPress CDN proxy (i0.wp.com).
// Fleet (page text captured via browser):
//   MV Serrano — catamaran, up to 20 guests, AUD 575/h, 3h min, BYO food & drinks
//   MV Naveah  — catamaran, 20–30 guests,  AUD 575/h, 3h min, BYO food & drinks
//   MV Bacchus — 62 ft motor yacht, up to 48 guests (35 recommended), price on request
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const JH = { ...H, 'Content-Type': 'application/json' }

const HOST = '72a6589c-d677-4720-b4c2-d1c69062c286'        // BoatHire24 managed account
const SUBMISSION = 'b6894706-ffe5-4669-a8c7-e33407ddd4aa'  // Gold Coast Luxury Boat Charters lead
const PORT = 'Mariners Cove Marina, Southport'
const photon = (path) => `https://i0.wp.com/www.goldcoastluxuryboatcharters.com/wp-content/uploads/${path}`

const CAT_PRICING = [ [3, 1725], [4, 2300], [6, 3450], [8, 4600] ] // AUD 575/h, 3h minimum

const BOATS = [
  {
    name: 'MV Serrano', type: 'catamaran', cap: 20, slug: 'gold-coast-mv-serrano',
    tagline: 'Casual, well-equipped party catamaran on the Broadwater — up to 20 guests',
    description: 'MV Serrano is a casual and well-equipped catamaran, perfect for a day out with friends, family celebrations, or a cheeky bucks or hens party on the Gold Coast Broadwater. BYO food and drinks, use the onboard kitchenette and BBQ, and swim off Wave Break Island with the floatation devices and stand-up paddle boards. Charters run from Mariners Cove Marina, Southport, with a 3-hour minimum at AUD 575 per hour.',
    pricing: CAT_PRICING,
    images: ['layerslider/projects/Home-page-copy/Serrano-bow-with-girls.jpg', '2022/03/Serrano-party-on-bow.jpeg', '2022/03/Serrano-water-sports.jpeg'],
  },
  {
    name: 'MV Naveah', type: 'catamaran', cap: 30, slug: 'gold-coast-mv-naveah',
    tagline: 'Larger, modern party catamaran for groups of 20 to 30 guests',
    description: 'MV Naveah is the larger and more modern of the fleet, suiting groups over 20 and up to 30 guests. Dance the night away, enjoy a BBQ or use the kitchenette while the deckhands look after your party on the Gold Coast Broadwater. BYO food and drinks. Charters run from Mariners Cove Marina, Southport, with a 3-hour minimum at AUD 575 per hour.',
    pricing: CAT_PRICING,
    images: ['layerslider/projects/Home-page-copy/71.jpeg'],
  },
  {
    name: 'MV Bacchus', type: 'motor_yacht', cap: 48, len: 18.9, slug: 'gold-coast-mv-bacchus',
    tagline: '62-foot private motor yacht — fine dining, parties and corporate cruises',
    description: 'MV Bacchus is a 62-foot motorised yacht and one of the most elegant private charter options on the Gold Coast. Spacious facilities host up to 48 guests (35 recommended for comfort), with a large high-end commercial kitchen for buffet dinners or fine dining for up to 14, a large flat-screen TV, hi-fi audio, covered lounge areas and an onboard ice machine. Cruise Wavebreak Island, South Stradbroke, Couran Cove, Tipplers and Bums Bay with attentive, personalised service. Price on request.',
    pricing: [],
    images: ['2020/09/Bacchus-front-view-drone-scaled.jpg', '2020/09/Bacchus-Memorial-2.jpg', '2020/07/IMG_9256-scaled.jpg', '2020/09/Cute-Dog-onboard-Bacchus.jpg', '2020/09/IMG_1570.jpg'],
  },
]

// Existing Gold Coast location (slug gold-coast = Surfers Paradise, Australia)
const loc = (await (await fetch(`${SB}/rest/v1/locations?select=id&slug=eq.gold-coast&limit=1`, { headers: H })).json())[0]?.id
if (!loc) { console.error('gold-coast location not found'); process.exit(1) }
console.log('location:', loc)

for (const b of BOATS) {
  const row = {
    host_id: HOST, location_id: loc, submission_id: SUBMISSION, name: b.name, slug: b.slug, status: 'draft',
    tagline: b.tagline, description: b.description, type: b.type, capacity_pax: b.cap,
    ...(b.len ? { length_m: b.len } : {}), departure_port: PORT, min_hours: b.pricing.length ? 3 : 2,
    pricing_type: 'hourly', includes_skipper: true, instant_book: false, cancellation_policy: 'flexible',
    updated_at: new Date().toISOString(),
  }
  const ins = await fetch(`${SB}/rest/v1/boats`, { method: 'POST', headers: { ...JH, Prefer: 'return=representation' }, body: JSON.stringify(row) })
  if (!ins.ok) { console.error(`${b.name}:`, await ins.text()); continue }
  const id = (await ins.json())[0].id

  if (b.pricing.length) {
    await fetch(`${SB}/rest/v1/boat_pricing`, { method: 'POST', headers: JH, body: JSON.stringify(
      b.pricing.map(([h, p]) => ({ boat_id: id, duration_hours: h, price: p, currency: 'AUD' }))) })
  }
  await fetch(`${SB}/rest/v1/boat_features`, { method: 'POST', headers: JH, body: JSON.stringify(
    ['Skipper & deckhand included', 'BYO food & drinks welcome', 'BBQ & kitchenette onboard', 'Swimming stops (Wave Break Island)', 'Departs Mariners Cove Marina, Southport']
      .map((f) => ({ boat_id: id, feature: f }))) })

  let ok = 0
  const rows = []
  for (let i = 0; i < b.images.length; i++) {
    try {
      const resp = await fetch(photon(b.images[i]), { headers: { 'User-Agent': 'Mozilla/5.0' } })
      if (!resp.ok || !(resp.headers.get('content-type') || '').startsWith('image/')) { console.error('  img fail', b.images[i], resp.status); continue }
      const bytes = Buffer.from(await resp.arrayBuffer())
      const path = `goldcoast/${id}/${i}.jpg`
      const up = await fetch(`${SB}/storage/v1/object/boat-images/${path}`, { method: 'POST', headers: { ...H, 'Content-Type': 'image/jpeg', 'x-upsert': 'true' }, body: bytes })
      if (up.ok) { rows.push({ boat_id: id, storage_url: `${SB}/storage/v1/object/public/boat-images/${path}`, alt: `${b.name} — Gold Coast charter`, sort_order: i, is_hero: i === 0 }); ok++ }
    } catch (e) { console.error('  img err', b.images[i], e.message) }
  }
  if (rows.length) await fetch(`${SB}/rest/v1/boat_images`, { method: 'POST', headers: JH, body: JSON.stringify(rows) })
  console.log(`✓ ${b.name} (${b.slug}) — draft, ${ok}/${b.images.length} photos, ${b.pricing.length ? b.pricing.map(([h,p])=>h+'h:$'+p).join(' ') + ' AUD' : 'price on request'}`)
}
console.log('Done.')
