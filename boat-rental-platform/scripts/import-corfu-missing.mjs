#!/usr/bin/env node
// Add the 2 boats missing from the Costa Boats (corfuboatcharter.com) lead:
// Compass 168cc and Olympic 580cc Plus. Matches their canonical siblings under
// submission a11165c0 exactly: speedboat, Corfu, hourly (2h min), skipper incl,
// DRAFT. Per-hour price = the site's "From €X" (2h/4h/8h slots). Photos rehosted
// from the Shopify CDN. Source = corfuboatcharter.com collection products.json.
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY, DS = env.DEEPSEEK_API_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const JH = { ...H, 'Content-Type': 'application/json' }
const APPLY = process.argv.includes('--apply')

const HOST = '72a6589c-d677-4720-b4c2-d1c69062c286'
const SUB = 'a11165c0-9d52-4998-ac1a-ee7f89ccfd13'
const LOCATION = '79608f5a-a878-403f-9dd8-a1aac4205f38'
const PORT = 'Agios Georgios/Argyrades - Issos Beach Corfu'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36'

// (title on site) → our config
const WANT = {
  'Compass 168cc': { slug: 'corfu-compass-168cc', cap: 8 },
  'Olympic 580cc Plus': { slug: 'corfu-olympic-580cc-plus-2', cap: 8 },
}

const clean = (html) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim()

async function deepseek(name, text) {
  if (!DS) return null
  try {
    const r = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DS}` },
      body: JSON.stringify({ model: 'deepseek-chat', temperature: 0.3, max_tokens: 900, response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You write charter listing copy for a self-drive speedboat in Corfu, Greece (Agios Georgios / Issos Beach). Return JSON {"tagline":string,"description":string}. tagline <=90 chars, no exclamation marks. description 80-130 words, warm British English, second person, only facts implied by the equipment list, no em-dashes, no exclamation marks.' },
          { role: 'user', content: `Boat: ${name}\nEquipment/details:\n${text.slice(0, 900)}` },
        ] }),
      signal: AbortSignal.timeout(60000),
    })
    const j = await r.json()
    return JSON.parse(j.choices[0].message.content)
  } catch { return null }
}

const col = await (await fetch('https://corfuboatcharter.com/collections/speed-boats/products.json?limit=50', { headers: { 'User-Agent': UA, Accept: 'application/json' } })).json()
const existing = (await (await fetch(`${SB}/rest/v1/boats?select=name&submission_id=eq.${SUB}`, { headers: H })).json()).map((b) => b.name.toLowerCase())

let created = 0
for (const [title, cfg] of Object.entries(WANT)) {
  const p = col.products.find((x) => x.title.trim() === title)
  if (!p) { console.error('  ✗ not found on site:', title); continue }
  if (existing.includes(title.toLowerCase())) { console.log('  ≡ already under lead, skip:', title); continue }
  const base = Math.min(...p.variants.map((v) => parseFloat(v.price)).filter((n) => n > 0))
  const bodyTxt = clean(p.body_html)
  const copy = await deepseek(title, bodyTxt)
  const imgs = (p.images || []).map((im) => im.src).filter(Boolean).slice(0, 8)

  const row = {
    host_id: HOST, location_id: LOCATION, submission_id: SUB, name: title,
    slug: cfg.slug, status: 'draft', type: 'speedboat',
    capacity_pax: cfg.cap, departure_port: PORT,
    pricing_type: 'hourly', min_hours: 2, includes_skipper: true,
    instant_book: false, cancellation_policy: 'moderate',
    tagline: (copy?.tagline || `Self-drive ${title} speedboat from Issos Beach, Corfu`).slice(0, 200),
    description: (copy?.description || bodyTxt).slice(0, 5000) || null,
    updated_at: new Date().toISOString(),
  }
  console.log(`\n${APPLY ? '→' : 'DRY'} ${title}  (€${base}/hr → 2h=€${base * 2}, 4h=€${base * 4}, 8h=€${base * 8})  ${imgs.length} photos  slug=${cfg.slug}`)
  if (!APPLY) { console.log('   tagline:', row.tagline); continue }

  const ins = await fetch(`${SB}/rest/v1/boats`, { method: 'POST', headers: { ...JH, Prefer: 'return=representation' }, body: JSON.stringify(row) })
  if (!ins.ok) { console.error('  ✗ insert failed:', (await ins.text()).slice(0, 160)); continue }
  const id = (await ins.json())[0].id
  await fetch(`${SB}/rest/v1/boat_pricing`, { method: 'POST', headers: JH, body: JSON.stringify(
    [2, 4, 8].map((h) => ({ boat_id: id, duration_hours: h, price: Math.round(base * h), currency: 'EUR', season: 'all' }))) })
  // rehost photos
  let ok = 0
  for (let i = 0; i < imgs.length; i++) {
    try {
      const resp = await fetch(imgs[i], { headers: { 'User-Agent': UA } })
      if (!resp.ok || !(resp.headers.get('content-type') || '').startsWith('image/')) continue
      const bytes = Buffer.from(await resp.arrayBuffer())
      if (bytes.length < 6000) continue
      const path = `corfu/${id}/${i}.jpg`
      const up = await fetch(`${SB}/storage/v1/object/boat-images/${path}`, { method: 'POST', headers: { ...H, 'Content-Type': 'image/jpeg', 'x-upsert': 'true' }, body: bytes })
      if (up.ok) { await fetch(`${SB}/rest/v1/boat_images`, { method: 'POST', headers: JH, body: JSON.stringify([{ boat_id: id, storage_url: `${SB}/storage/v1/object/public/boat-images/${path}`, alt: `${title} — speedboat charter Corfu`, sort_order: i, is_hero: ok === 0 }]) }); ok++ }
    } catch { /* skip */ }
  }
  existing.push(title.toLowerCase())
  created++
  console.log(`   ✓ created ${id} with ${ok} photos, pricing 2h/4h/8h`)
}
console.log(`\n${APPLY ? 'DONE' : 'DRY RUN'}: ${created} created. Re-run with --apply.`)
