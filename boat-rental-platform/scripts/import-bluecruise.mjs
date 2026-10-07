#!/usr/bin/env node
// Import two crewed gulets from bluecruisebodrum.com (Blue Cruise Bodrum) under
// the operator's OWN host account sales@bluecruisebodrum.com. These are weekly
// crewed charters; we store the LOW-season weekly rate as the "from" price
// (duration_days = 7), instant_book = false so booking is request-first (no card
// — the operator confirms availability and sends a tailored quote/pay link).
// Specs + descriptions are curated from each boat's detail page; photos are the
// page's own numbered gallery, rehosted (md5 byte-dedup) into boat-images.
//   DRY_RUN=1 node scripts/import-bluecruise.mjs   # prints, writes nothing
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter((l) => l.includes('=') && !l.trimStart().startsWith('#'))
  .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const JH = { ...H, 'Content-Type': 'application/json' }
const UA = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36', 'Accept': 'image/avif,image/webp,*/*', 'Referer': 'https://www.bluecruisebodrum.com/' }
const DRY = process.env.DRY_RUN === '1'

const HOST = '0621f05e-a06c-4fe9-8abf-654becf4bd81'      // sales@bluecruisebodrum.com / Blue Cruise Bodrum
const LOCATION = '79fe6277-6bf3-4869-b70d-9f9bc3e17e1b'  // Bodrum, Turkey
const BASE = 'https://www.bluecruisebodrum.com'
const AREA = 'She cruises the Turkish Aegean between Bodrum, Gocek, Marmaris and Fethiye.'
const CLOSER = 'The price shown is a starting weekly rate; contact us for a tailored quote for your dates.'

const BOATS = [
  {
    name: 'Bella Mare', slug: 'bodrum-gulet-bella-mare',
    imgDir: 'bellamare', imgNums: Array.from({ length: 53 }, (_, i) => i + 1),
    length_m: 38, capacity_pax: 12, cabins: 6, bathrooms: 6, model_year: 2008,
    weekly_from: 28000, // April low season; peak (Jul/Aug) €49,000
    tagline: 'Luxury 38m crewed gulet for up to 12 guests in Bodrum',
    features: ['Professional crew of 7 (incl. private chef)', 'Air conditioning in all cabins', 'En-suite shower & WC', 'Unlimited Wi-Fi', 'Jet ski', 'Seabob', '2 x Canoe', 'Water ski & wakeboard', '2 x Paddleboard', 'Ringo', '115hp tender', 'Snorkelling gear', 'Fishing gear', 'TV / DVD / music system', 'GPS & VHF', 'Ice maker', 'Sun beds & awnings', 'Separate crew cabins'],
    description: `Bella Mare is a 38-metre traditional gulet, built in 2008 and refitted in 2018. She sleeps up to 12 guests across six en-suite cabins, arranged as two master and four double, each with its own air conditioning, shower and home-style toilet, with separate crew quarters. A professional crew of seven, including a private chef, looks after you throughout your blue cruise, cruising at around 11 knots. On board there are separate dining areas in the saloon and on deck, a fully equipped galley, an American bar and generous sunbathing space for twelve. The toy locker is well stocked with a jet ski, Seabob, two canoes, water skis, a wakeboard, two paddleboards, a ringo and a 115hp tender, alongside snorkelling and fishing gear, a TV, DVD, music system and board games. ${AREA} Weekly charter runs from €28,000 in April up to €49,000 in high season. A full or half board food and soft-drinks package is available from €400 per person per week. ${CLOSER}`,
  },
  {
    name: 'Wicked Felina', slug: 'bodrum-gulet-wicked-felina',
    imgDir: 'wicked-felina', imgNums: Array.from({ length: 34 }, (_, i) => i + 1),
    length_m: 34, capacity_pax: 10, cabins: 5, bathrooms: 5, model_year: 2004,
    weekly_from: 17500, // May low season; peak (Jul/Aug) €23,800
    tagline: '34m crewed gulet for up to 10 guests in Bodrum',
    features: ['Professional crew of 5', 'Air conditioning in all cabins (24h)', 'En-suite shower & WC', 'TV in all cabins', 'Safe box', 'Unlimited Wi-Fi', 'Jet ski', 'Seabob', 'Water ski & wakeboard', '2 x Paddleboard', '2 x Canoe', 'Ringo & Big Mable', 'PlayStation & Netflix', 'Sound system', 'Snorkelling gear', '10 sun mattresses', 'Deck shower', 'Ice maker & coffee machine', 'Water maker', 'Separate crew cabins'],
    description: `Wicked Felina is a 34-metre traditional gulet, built in 2004 and refitted in 2017. She sleeps up to 10 guests across five en-suite cabins, arranged as one master and four double, each with its own air conditioning, TV, wardrobe, safe box, shower and home-style toilet, with separate crew quarters. A professional crew of five looks after you throughout your blue cruise, cruising at around 10 knots. She is one of the few gulets in Turkey fitted with 24-hour air conditioning, electric toilets, a PlayStation, Netflix and a full sound system. The toy locker holds a jet ski, Seabob, water skis, a wakeboard, two paddleboards, two canoes, a ringo and a big mable, alongside snorkelling gear, ten sun mattresses and a deck shower. ${AREA} Weekly charter runs from €17,500 in May up to €23,800 in high season. A full or half board food and soft-drinks package is available from €400 per person per week. ${CLOSER}`,
  },
  {
    // Added 2026-07-19 from the operator's third listing. Unlike the other two,
    // her page publishes NO weekly rate (the €45.5k/€17.5k/€28k cards on it are a
    // "other gulets" carousel — the €28k one is labelled BELLA MARE), so she goes
    // live price-on-request rather than carrying an invented number.
    name: 'Bodrum Queen', slug: 'bodrum-gulet-bodrum-queen',
    imgDir: 'bodrum-queen', imgNums: Array.from({ length: 35 }, (_, i) => i + 1),
    length_m: 27, capacity_pax: 12, cabins: 6, bathrooms: 6, model_year: 1999,
    weekly_from: null, // price on request — nothing published for this hull
    tagline: '27m crewed gulet for up to 12 guests in Bodrum',
    features: ['Professional crew of 4 (incl. chef)', 'Air conditioning (8-10h daily)', 'En-suite shower & WC in every cabin', 'Unlimited Wi-Fi (Turkish coast)', 'Fuel for cruising included', '40hp dinghy', '2 x Canoe', '2 x Paddleboard', 'Fishing equipment', 'Snorkelling equipment', '4 x Smart TV', 'PlayStation, Netflix & YouTube', 'Flybridge', 'Deck shower', 'Freezer & ice machine', 'Coffee & espresso machine', 'Indoor lounge', 'Sea ladder', 'Shade tents', 'Sun beds', 'Washing machine & dishwasher', 'Separate crew cabins'],
    description: `Bodrum Queen is a 27-metre traditional gulet, built in 1999 and refitted in 2020. She sleeps up to 12 guests across six en-suite cabins, arranged as two master and four double, each with its own shower and WC, with separate crew quarters. A professional crew of four, including a chef, looks after you throughout your blue cruise, with a 7.30-metre beam and a single 480hp Caterpillar for a steady, unhurried ride. On board there is an indoor lounge, a flybridge, sun beds and shade tents, four smart TVs with PlayStation, Netflix and YouTube, a deck shower, freezer, ice machine and coffee and espresso machines. The toy locker holds a 40hp dinghy, two canoes, two paddleboards and fishing and snorkelling equipment. The charter price includes the private yacht, professional crew, fuel for cruising (two to three hours a day on average), air conditioning, unlimited Wi-Fi, bed linen and towels, harbour fees and local taxes. Food is arranged separately: a full-board and soft-drinks package is €450 per person per week, half board €400, and you are welcome to bring your own drinks aboard. ${AREA} Send your dates and group size and the crew will come back with a tailored quote.`,
  },
]

const boatRow = (b) => ({
  host_id: HOST, location_id: LOCATION, name: b.name, slug: b.slug, status: process.env.STATUS || 'active',
  tagline: b.tagline, description: b.description.replace(/\s+/g, ' ').trim(),
  type: 'gulet', length_m: b.length_m, capacity_pax: b.capacity_pax, cabins: b.cabins,
  bathrooms: b.bathrooms, model_year: b.model_year, departure_port: 'Bodrum',
  includes_skipper: true, includes_fuel: true, includes_drinks: false,
  min_hours: 24, pricing_type: 'daily', instant_book: false,
  cancellation_policy: 'moderate', updated_at: new Date().toISOString(),
})

async function fetchImages(b, boatId) {
  const seen = new Set(); const rows = []; let i = 0
  for (const n of b.imgNums) {
    try {
      const resp = await fetch(`${BASE}/img/${b.imgDir}/${n}.jpg`, { headers: UA, signal: AbortSignal.timeout(30000) })
      if (!resp.ok || !(resp.headers.get('content-type') || '').startsWith('image/')) continue
      const bytes = Buffer.from(await resp.arrayBuffer())
      if (bytes.length < 8000) continue
      const hash = createHash('md5').update(bytes).digest('hex')
      if (seen.has(hash)) continue
      seen.add(hash)
      if (DRY) { rows.push({ n, size: bytes.length }); i++; continue }
      const path = `bluecruise/${boatId}/${i}.jpg`
      const up = await fetch(`${SB}/storage/v1/object/boat-images/${path}`, { method: 'POST', headers: { ...H, 'Content-Type': 'image/jpeg', 'x-upsert': 'true' }, body: bytes })
      if (up.ok) rows.push({ boat_id: boatId, storage_url: `${SB}/storage/v1/object/public/boat-images/${path}`, alt: `${b.name} — gulet charter Bodrum`, sort_order: i, is_hero: i === 0 })
      i++
    } catch (e) { console.error('   img fail', n, e.message?.slice(0, 60)) }
  }
  return rows
}

// existing boats under this host — skip if a same-name boat already exists
const existing = await (await fetch(`${SB}/rest/v1/boats?select=name,slug&host_id=eq.${HOST}`, { headers: H })).json()
const haveName = new Set((existing || []).map((b) => b.name.toLowerCase().trim()))

let created = 0
for (const b of BOATS) {
  if (haveName.has(b.name.toLowerCase().trim())) { console.log(`  = skip (already exists): ${b.name}`); continue }

  if (DRY) {
    const imgs = await fetchImages(b, 'dry')
    console.log(`\n● ${b.name} → ${b.slug}`)
    console.log(`   ${b.length_m}m · ${b.cabins} cabins · ${b.capacity_pax} guests · gulet · crew/chef`)
    console.log(`   price: ${b.weekly_from ? `from €${b.weekly_from.toLocaleString()} / 7 days` : 'PRICE ON REQUEST (none published)'} (request-first, no card)`)
    console.log(`   features: ${b.features.length} · photos reachable: ${imgs.length}/${b.imgNums.length}`)
    continue
  }

  const ins = await fetch(`${SB}/rest/v1/boats`, { method: 'POST', headers: { ...JH, Prefer: 'return=representation' }, body: JSON.stringify(boatRow(b)) })
  if (!ins.ok) { console.error(`  ✗ ${b.name}: ${(await ins.text()).slice(0, 200)}`); continue }
  const id = (await ins.json())[0].id

  await fetch(`${SB}/rest/v1/boat_features`, { method: 'POST', headers: JH, body: JSON.stringify(b.features.map((f) => ({ boat_id: id, feature: f }))) })
  // No published rate → leave boat_pricing empty; the listing then renders as
  // "Price on request" with the enquiry form instead of an invented price.
  if (b.weekly_from) {
    await fetch(`${SB}/rest/v1/boat_pricing`, { method: 'POST', headers: JH, body: JSON.stringify([{ boat_id: id, duration_days: 7, duration_hours: null, price: b.weekly_from, currency: 'EUR', season: 'all' }]) })
  }

  const rows = await fetchImages(b, id)
  if (rows.length) await fetch(`${SB}/rest/v1/boat_images`, { method: 'POST', headers: JH, body: JSON.stringify(rows) })

  created++
  console.log(`  ✓ ${b.name} (${b.slug}) — ${b.features.length} features, ${rows.length} photos, ${b.weekly_from ? `from €${b.weekly_from.toLocaleString()}/wk` : 'price on request'}`)
  console.log(`     BOAT_ID=${id}`)
}
console.log(`\nDONE (${DRY ? 'DRY-RUN' : 'LIVE'}): ${created} created of ${BOATS.length}`)
