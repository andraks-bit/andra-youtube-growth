#!/usr/bin/env node
// One-off: import the boats from hvarexcursions.com/en/best-rental-deals-in-hvar
// as DRAFTS under the "ivan" lead (managed BoatHire24 account).
//   node scripts/import-ivan-hvar.mjs           # dry run — extract + preview
//   node scripts/import-ivan-hvar.mjs --apply   # create the draft listings
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY, DS = env.DEEPSEEK_API_KEY
const APPLY = process.argv.includes('--apply')
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

const PAGE = 'https://www.hvarexcursions.com/en/best-rental-deals-in-hvar'
const HOST = '72a6589c-d677-4720-b4c2-d1c69062c286'   // BoatHire24 managed account
const SUBMISSION = '04039f43-2e95-40c6-afd5-ba2d06aac2e7' // ivan lead
const LOCATION = '3bd5a527-244b-4a33-9e07-d5182a0ab9bc'   // Hvar Town, Croatia

const slugify = (s) => (s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
const buildBoatSlug = ({ city, builder, name }) => {
  const seen = new Set(), parts = []
  for (const raw of [city, builder, name]) { if (!raw) continue; const w = slugify(raw).split('-').filter((x) => x && !seen.has(x)); if (!w.length) continue; w.forEach((x) => seen.add(x)); parts.push(w.join('-')) }
  let s = parts.join('-'); if (s.length > 60) s = s.slice(0, 60).replace(/-[^-]*$/, ''); return s || 'boat'
}
const mapType = (raw) => { const t = String(raw ?? '').toLowerCase().replace(/[\s-]+/g, '_')
  if (/(motor|fly|power).*yacht|^yacht$|motorboat|cruiser/.test(t)) return 'motor_yacht'
  if (/catamaran/.test(t)) return 'catamaran'; if (/sail|velero/.test(t)) return 'sailing'
  if (/speed|sport|bowrider|day_?boat/.test(t)) return 'speedboat'; if (/fish/.test(t)) return 'fishing'
  if (/rib|inflatable|zodiac|dinghy/.test(t)) return 'rib'; if (/luxury|super_?yacht|mega/.test(t)) return 'luxury'
  if (/jet_?ski/.test(t)) return 'jet_ski'; if (/gulet/.test(t)) return 'gulet'
  return ['motor_yacht','catamaran','sailing','speedboat','fishing','rib','luxury','jet_ski','gulet'].includes(t) ? t : 'speedboat' }

const EXTRACT_SYSTEM = `You extract boat/yacht charter listings from the text of a web page.
Return JSON: {"boats":[{"name":string,"type":string,"length_m":number|null,"capacity_pax":number,"cabins":number|null,"builder":string|null,"model_year":number|null,"departure_port":string|null,"currency":string,"prices":[{"duration_hours":number,"price":number}],"features":[string],"tagline":string,"description":string}]}
Rules:
- ONE page can list MANY boats — extract EVERY distinct rentable boat (up to 25), each its own object. Do not merge boats, do not stop at the first.
- EXCLUDE land vehicles: cars, scooters, mopeds, motorbikes, Vespas, quad bikes/ATVs, bicycles. Return ONLY boats.
- type: one of motor_yacht, catamaran, sailing, speedboat, fishing, rib, luxury, jet_ski, gulet. A small open motorboat/RIB with an outboard is "rib" or "speedboat".
- length_m in metres. capacity_pax: max guests (default 8 if absent).
- prices: per the page. per-hour -> {"duration_hours":1,"price":hourly}; half day -> 4; full day/per day -> 8; per week -> 168. Numbers only. No price -> empty array.
- currency: 3-letter code (EUR if € or unclear in Europe).
- features: up to 15 short amenity names. tagline: one line max 90 chars, no exclamation marks.
- description: 100-160 words, warm British English, second person, only facts from the page, no em-dashes, no exclamation marks.`

const html = await (await fetch(PAGE, { headers: { 'User-Agent': 'Mozilla/5.0' } })).text()
const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim().slice(0, 48000)

// All rental photos on the page, namespaced per boat under /img/rentals/photos/<slug>/
const imgs = [...new Set([...html.matchAll(/https?:\/\/[^"'\s)]+\.(?:jpe?g|png|webp)/gi)].map((m) => m[0]))]
  .filter((u) => /\/img\/rentals\/photos\//i.test(u))
const imagesFor = (name) => {
  const toks = slugify(name).split('-').filter((t) => t.length >= 3 || /^\d{2,}$/.test(t))
  const hit = imgs.filter((u) => { const p = decodeURI(u).toLowerCase(); return toks.some((t) => p.includes(t)) })
  return [...new Set(hit)].slice(0, 10)
}

const ds = await (await fetch('https://api.deepseek.com/chat/completions', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DS}` },
  body: JSON.stringify({ model: 'deepseek-chat', temperature: 0.2, max_tokens: 8000, response_format: { type: 'json_object' },
    messages: [{ role: 'system', content: EXTRACT_SYSTEM }, { role: 'user', content: `URL: ${PAGE}\n\nPAGE TEXT:\n${text}` }] }),
})).json()
const boats = JSON.parse(ds.choices[0].message.content).boats || []

console.log(`Extracted ${boats.length} boats:\n`)
for (const b of boats) console.log(`  ${b.name} — ${mapType(b.type)} · ${b.capacity_pax}pax · ${(b.prices||[]).map(p=>p.price+'/'+p.duration_hours+'h').join(', ')||'no price'} · ${imagesFor(b.name).length} imgs`)

if (!APPLY) { console.log('\nDry run. Re-run with --apply to create drafts.'); process.exit(0) }

let created = 0
for (const b of boats) {
  const name = String(b.name).trim().slice(0, 120); if (!name) continue
  const base = buildBoatSlug({ city: 'Hvar Town', builder: b.builder, name })
  let slug = base
  for (let n = 1; n <= 15; n++) {
    slug = n === 1 ? base : `${base}-${n}`
    if (!(await (await fetch(`${SB}/rest/v1/boats?slug=eq.${slug}&select=id`, { headers: H })).json()).length) break
  }
  const cur = /^[A-Z]{3}$/.test(String(b.currency||'').toUpperCase()) ? b.currency.toUpperCase() : 'EUR'
  const row = { host_id: HOST, location_id: LOCATION, submission_id: SUBMISSION, name, slug, status: 'draft',
    tagline: String(b.tagline||'').slice(0,200)||null, description: String(b.description||'').slice(0,5000)||null,
    type: mapType(b.type), length_m: Number(b.length_m)>0?Number(b.length_m):null,
    capacity_pax: Math.min(200,Math.max(1,Math.round(Number(b.capacity_pax)||8))),
    builder: String(b.builder||'').slice(0,80)||null, pricing_type:'hourly', min_hours:2, instant_book:false, cancellation_policy:'flexible', updated_at:new Date().toISOString() }
  const ins = await fetch(`${SB}/rest/v1/boats`, { method:'POST', headers:{...H,Prefer:'return=representation'}, body:JSON.stringify(row) })
  if (!ins.ok) { console.error('FAIL', name, await ins.text()); continue }
  const boatId = (await ins.json())[0].id
  const seenDur = new Set()
  const pricing = (Array.isArray(b.prices)?b.prices:[]).map((p)=>({duration_hours:Math.round(Number(p.duration_hours)),price:Math.round(Number(p.price))})).filter((p)=>p.duration_hours>=1&&p.duration_hours<=720&&p.price>0).filter((p)=>!seenDur.has(p.duration_hours)&&seenDur.add(p.duration_hours)).slice(0,6)
  if (pricing.length) await fetch(`${SB}/rest/v1/boat_pricing`, { method:'POST', headers:H, body:JSON.stringify(pricing.map((p)=>({boat_id:boatId,...p,currency:cur}))) })
  const feats = (Array.isArray(b.features)?b.features:[]).map((f)=>String(f).trim().slice(0,60)).filter(Boolean).slice(0,15)
  if (feats.length) await fetch(`${SB}/rest/v1/boat_features`, { method:'POST', headers:H, body:JSON.stringify(feats.map((f)=>({boat_id:boatId,feature:f}))) })
  const pics = imagesFor(name)
  if (pics.length) await fetch(`${SB}/rest/v1/boat_images`, { method:'POST', headers:H, body:JSON.stringify(pics.map((u,i)=>({boat_id:boatId,storage_url:u,alt:name,sort_order:i,is_hero:i===0}))) })
  created++; console.log(`  ✓ ${name} (${slug}) — ${pricing.length} prices, ${pics.length} imgs`)
}
console.log(`\nCreated ${created} draft listings under ivan.`)
