#!/usr/bin/env node
// Import 4 gulets from korayyachting.com (Jimdo site) under the operator's OWN
// host account info@korayyachting.com (Koray Akış), based in Bodrum. These are
// crewed weekly gulet charters priced "on request" — so NO pricing rows are
// stored (the boat page then shows the platform's native enquiry form). Specs
// are curated from each boat's detail page; photos are the page-unique Jimdo
// images, rehosted into the boat-images bucket. DRY_RUN=1 prints, writes nothing.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const JH = { ...H, 'Content-Type': 'application/json' }
const UA = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
const DRY = process.env.DRY_RUN === '1'

const HOST = '1dd35c86-9af9-4b62-a77f-8203da00bfe4'      // info@korayyachting.com / Koray Akış
const LOCATION = '79fe6277-6bf3-4869-b70d-9f9bc3e17e1b'  // Bodrum, Turkey
const STATUS = process.env.STATUS || 'active'
const AREA = 'She cruises the Turkish coast between Bodrum, Marmaris, Fethiye and Datça.'
const CLOSER = 'Price is on request — contact us for a tailored offer for your dates.'

// Curated straight from each boat's detail page on korayyachting.com.
const BOATS = [
  {
    name: 'Arif Kaptan A', url: 'https://www.korayyachting.com/gulet-charter/5-6-cabins-3-page/gulet-arif-kaptan-a/',
    length_m: 36, capacity_pax: 12, cabins: 6, bathrooms: 6, model_year: 2010, ac: true,
    tagline: 'Super-luxury 36m crewed gulet for up to 12 guests in Bodrum',
    features: ['Professional crew of 7', 'Air conditioning in all cabins', 'En-suite bathrooms', 'Wifi', 'Television', 'Snorkelling gear', 'Fishing equipment', 'Fresh linen & towels', 'Canoe', 'Windsurf', 'Water ski', 'Wakeboard', 'Kneeboard', 'Ringo & banana', 'Board games'],
    description: `Arif Kaptan A is a super-luxury traditional gulet built in 2010, measuring 36 metres with a generous 8.2-metre beam. She sleeps up to 12 guests across six en-suite cabins, arranged as two double, two twin and two master, each with its own air conditioning. A professional crew of seven looks after you throughout your blue cruise. Twin 550hp engines give a comfortable cruising speed of around 12 knots, and the toy locker is well stocked with a canoe, windsurf, water ski, wakeboard, kneeboard, ringo and banana. On board you will also find a television, wifi, snorkelling gear, fishing equipment and games for quieter afternoons. ${AREA} ${CLOSER}`,
  },
  {
    name: 'Avrasya 1', url: 'https://www.korayyachting.com/gulet-charter/5-6-cabins-3-page/gulet-avrasya-1/',
    length_m: 24, capacity_pax: 11, cabins: 5, bathrooms: 5, model_year: 1997, ac: true,
    tagline: 'Super-luxury 24m crewed gulet for up to 11 guests in Bodrum',
    features: ['Professional crew of 4', 'Air conditioning in all cabins', 'En-suite bathrooms', 'Wifi', 'Television', 'Snorkelling gear', 'Fishing equipment', 'Hairdryers', 'Fresh linen & towels', 'Canoe', 'Stand-up paddleboard', 'Board games'],
    description: `Avrasya 1 is a super-luxury traditional gulet, originally built in 1997 and fully refitted in 2010, measuring 24 metres with a 6.2-metre beam. She sleeps up to 11 guests across five en-suite cabins, arranged as two double, two master and one triple, each with its own air conditioning. A professional crew of four looks after you throughout your blue cruise. Twin 300hp engines give a cruising speed of around 11 knots, and on deck you will find a canoe and a stand-up paddleboard. Indoors there is a television, wifi, snorkelling gear, fishing equipment, hairdryers and games for relaxed afternoons. ${AREA} ${CLOSER}`,
  },
  {
    name: 'Sevi 5', url: 'https://www.korayyachting.com/gulet-charter/5-6-cabins/gulet-sevi-5/',
    length_m: 20, capacity_pax: 12, cabins: 6, bathrooms: 6, model_year: 2002, ac: true,
    tagline: 'Standard-plus 20m crewed gulet for up to 12 guests in Bodrum',
    features: ['Professional crew of 3', 'Air conditioning in all cabins', 'En-suite bathrooms', 'Wifi', 'Television', 'Snorkelling gear', 'Fishing equipment', 'Fresh linen & towels', 'Canoe', 'Board games'],
    description: `Sevi 5 is a standard-plus traditional gulet built in 2002, measuring 20 metres with a 5.2-metre beam. She sleeps up to 12 guests across six en-suite double cabins, each with its own air conditioning. A friendly crew of three looks after you throughout your blue cruise. Her 255hp engine gives an easy cruising speed of around 9 knots, and there is a canoe on board for exploring the bays. Indoors you will find a television, wifi, snorkelling gear, fishing equipment and games for quieter moments. ${AREA} ${CLOSER}`,
  },
  {
    name: 'Flas 2', url: 'https://www.korayyachting.com/gulet-charter/5-6-cabins/gulet-flas-2/',
    length_m: 21, capacity_pax: 12, cabins: 6, bathrooms: 6, model_year: 1997, ac: false,
    tagline: 'Traditional 21m crewed gulet for up to 12 guests in Bodrum',
    features: ['Professional crew of 3', 'En-suite bathrooms', 'Wifi', 'Television', 'Snorkelling gear', 'Fishing equipment', 'Hairdryers', 'Fresh linen & towels', 'Canoe', 'Board games'],
    description: `Flas 2 is a traditional standard-class gulet, originally built in 1997 and refitted in 2010, measuring 21 metres with a 5.8-metre beam. She sleeps up to 12 guests across six en-suite double cabins. A friendly crew of three looks after you throughout your blue cruise. Her 225hp engine gives a relaxed cruising speed of around 8 knots, and there is a canoe on board for reaching the quieter coves. Indoors you will find a television, wifi, snorkelling gear, fishing equipment, hairdryers and games for easy afternoons. ${AREA} ${CLOSER}`,
  },
]

const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

// ── Jimdo image harvest ── key each image by <id>/<version> (dimension-agnostic),
// keep the max width seen per page, and treat a key as "belonging" to a page only
// where it appears at large size. A gallery photo is large on its own page and a
// 25px thumbnail on sibling pages, so large-size uniqueness = the boat's own photos.
const ID_RE = /image\.jimcdn\.com\/app\/cms\/image\/transf\/([^/]+)\/path\/([a-z0-9]+)\/image\/([a-z0-9]+)\/version\/(\d+)\/([^"' \\)]+)/gi
const LARGE = 300
const bigUrl = (path, id, ver) => `https://image.jimcdn.com/app/cms/image/transf/dimension=1600x10000:format=jpg/path/${path}/image/${id}/version/${ver}/image.jpg`

async function pageImages(url) {
  const html = await (await fetch(url, { headers: UA, signal: AbortSignal.timeout(30000) })).text()
  const map = new Map()
  for (const m of html.matchAll(ID_RE)) {
    const [, dim, path, id, ver, fname] = m
    if (/logo|favicon|icon|yacht-charter\.png|private-yacht/i.test(fname)) continue
    const key = `${id}/${ver}`
    const w = +(dim.match(/dimension=(\d+)x/)?.[1] ?? 0)
    if (!map.has(key) || w > map.get(key).w) map.set(key, { path, id, ver, w })
  }
  return map
}

// pass 1: fetch all pages, build large-size frequency
const maps = {}
const largeFreq = new Map()
for (const b of BOATS) {
  const map = await pageImages(b.url)
  maps[b.name] = map
  for (const [k, v] of map) if (v.w >= LARGE) largeFreq.set(k, (largeFreq.get(k) || 0) + 1)
}

// existing boats under this host — skip if a same-name boat already exists
const existing = (await (await fetch(`${SB}/rest/v1/boats?select=name,slug&host_id=eq.${HOST}`, { headers: H })).json())
const haveName = new Set(existing.map((b) => b.name.toLowerCase().trim()))

let created = 0
for (const b of BOATS) {
  if (haveName.has(b.name.toLowerCase().trim())) { console.log(`  ≡ skip (already exists): ${b.name}`); continue }
  const own = [...maps[b.name].entries()]
    .filter(([k, v]) => v.w >= LARGE && largeFreq.get(k) === 1)
    .map(([, v]) => v)

  const base = `koray-gulet-${slugify(b.name)}`.slice(0, 60).replace(/-$/, '')
  let slug = base
  for (let n = 2; n <= 12; n++) {
    if (!(await (await fetch(`${SB}/rest/v1/boats?slug=eq.${slug}&select=id`, { headers: H })).json()).length) break
    slug = `${base}-${n}`
  }

  const row = {
    host_id: HOST, location_id: LOCATION, name: b.name, slug, status: STATUS,
    tagline: b.tagline, description: b.description.replace(/\s+/g, ' ').trim(),
    type: 'gulet', length_m: b.length_m, capacity_pax: b.capacity_pax, cabins: b.cabins,
    bathrooms: b.bathrooms, model_year: b.model_year, departure_port: 'Bodrum',
    includes_skipper: true, includes_fuel: true, includes_drinks: false,
    min_hours: 24, pricing_type: 'daily', instant_book: false,
    cancellation_policy: 'moderate', updated_at: new Date().toISOString(),
  }

  if (DRY) {
    console.log(`\n● ${b.name} → ${slug}  [${STATUS}]  photos:${own.length}  price:on-request`)
    console.log(`   ${b.length_m}m · ${b.cabins} cabins · ${b.capacity_pax} guests · ${b.features.length} features`)
    continue
  }

  const ins = await fetch(`${SB}/rest/v1/boats`, { method: 'POST', headers: { ...JH, Prefer: 'return=representation' }, body: JSON.stringify(row) })
  if (!ins.ok) { console.error(`  ✗ ${b.name}: ${(await ins.text()).slice(0, 200)}`); continue }
  const id = (await ins.json())[0].id

  await fetch(`${SB}/rest/v1/boat_features`, { method: 'POST', headers: JH, body: JSON.stringify(b.features.map((f) => ({ boat_id: id, feature: f }))) })

  // rehost photos (md5 byte-dedup)
  const seen = new Set()
  const rows = []
  let i = 0
  for (const im of own) {
    try {
      const resp = await fetch(bigUrl(im.path, im.id, im.ver), { headers: UA, signal: AbortSignal.timeout(30000) })
      if (!resp.ok || !(resp.headers.get('content-type') || '').startsWith('image/')) continue
      const bytes = Buffer.from(await resp.arrayBuffer())
      if (bytes.length < 8000) continue
      const hash = createHash('md5').update(bytes).digest('hex')
      if (seen.has(hash)) continue
      seen.add(hash)
      const path = `koray/${id}/${i}.jpg`
      const up = await fetch(`${SB}/storage/v1/object/boat-images/${path}`, { method: 'POST', headers: { ...H, 'Content-Type': 'image/jpeg', 'x-upsert': 'true' }, body: bytes })
      if (up.ok) rows.push({ boat_id: id, storage_url: `${SB}/storage/v1/object/public/boat-images/${path}`, alt: `${b.name} — gulet charter Bodrum`, sort_order: i, is_hero: i === 0 })
      i++
    } catch (e) { console.error('   img fail', e.message?.slice(0, 80)) }
  }
  if (rows.length) await fetch(`${SB}/rest/v1/boat_images`, { method: 'POST', headers: JH, body: JSON.stringify(rows) })

  created++
  console.log(`  ✓ ${b.name} (${slug}) — ${b.features.length} features, ${rows.length} photos, price on request`)
}
console.log(`\nDONE (${DRY ? 'DRY-RUN' : STATUS}): ${created} created of ${BOATS.length}`)
