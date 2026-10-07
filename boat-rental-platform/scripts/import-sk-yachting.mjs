#!/usr/bin/env node
// Import SK-Yachting (Marmaris) fleet — 31 boats scraped in-browser (Tilda site
// 403s server fetches) — as DRAFTS under the SKI-YACHTING lead. DeepSeek turns
// each page's text into structured specs; Tilda photos are rehosted.
import { readFileSync } from 'node:fs'

const SP = '/private/tmp/claude-501/-Users-master-boat-rental-marbella/8d2bc1b0-3274-436a-a898-a82bbdc8701e/scratchpad'
const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY, DS = env.DEEPSEEK_API_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const JH = { ...H, 'Content-Type': 'application/json' }
const APPLY = process.argv.includes('--apply')

const HOST = '72a6589c-d677-4720-b4c2-d1c69062c286'        // BoatHire24 managed
const SUBMISSION = 'f488af77-9378-4a96-bc32-58e0809ead78' // SKI-YACHTING
const LOCATION = '95b2dcdf-0e7e-4b1c-b217-52fedbb3aae2'   // Marmaris, Turkey

const fleet = JSON.parse(readFileSync(`${SP}/sk-fleet-payload.json`, 'utf8'))
const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const EXTRACT = `You extract ONE sailing/catamaran charter yacht from a page's text (Marmaris, Turkey; SK-Yachting).
The label lines and their values are separated (Tilda layout): e.g. "Year of Built:","Length overall:" then later "2020","15.20 m" — match them in order.
Return JSON {"boat":{"name":string,"type":"sailing"|"catamaran","length_m":number|null,"cabins":number|null,"berths":number|null,"model_year":number|null,"builder":string|null,"currency":"EUR","weekly_price":number|null,"features":[string],"tagline":string,"description":string}}
- name: the vessel's own name (often after a dash, e.g. "DUFOUR 520 GL - LA ESPERANZA" -> name "La Esperanza (Dufour 520 GL)"). If no personal name, use the model.
- type: "catamaran" for Lagoon/Fountaine Pajot/Saona/Elba/Astrea/Lucia/Isla/Bali; else "sailing".
- length_m from "Length overall" (metres). cabins from "Cabins". berths from "Berths".
- builder = brand (Dufour, Bavaria, Jeanneau, Beneteau, Lagoon, Fountaine Pajot).
- weekly_price: the first EUR weekly charter price if present, else null. Ignore "each following week" secondary prices.
- features: up to 10 short amenities actually listed (air conditioning, bow thruster, furling main sail, chartplotter, etc). IGNORE the "SIMILAR YACHTS" block entirely.
- tagline: one line <=90 chars, no exclamation marks. description: 90-150 words, warm British English, second person, only facts on the page, no em-dashes or exclamation marks.`

async function deepseek(name, text) {
  const r = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DS}` },
    body: JSON.stringify({ model: 'deepseek-chat', temperature: 0.2, max_tokens: 1600, response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: EXTRACT }, { role: 'user', content: `Listing name hint: ${name}\n\nPAGE TEXT:\n${text}` }] }),
    signal: AbortSignal.timeout(90000),
  })
  const j = await r.json()
  return JSON.parse(j.choices[0].message.content).boat
}

const entries = Object.entries(fleet)
if (!APPLY) {
  // dry: extract first 2 to sanity-check
  for (const [slug, d] of entries.slice(0, 2)) {
    const b = await deepseek(d.name, d.text)
    console.log(slug, '→', JSON.stringify({ name: b.name, type: b.type, len: b.length_m, cabins: b.cabins, year: b.model_year, wk: b.weekly_price }))
  }
  console.log('\nDry run. Re-run with --apply.')
  process.exit(0)
}

const existing = (await (await fetch(`${SB}/rest/v1/boats?select=name&submission_id=eq.${SUBMISSION}`, { headers: H })).json()).map((b) => b.name.toLowerCase())
let created = 0, failed = 0, ei = 0
async function worker() {
  while (ei < entries.length) {
    const [slug, d] = entries[ei++]
    try {
      const b = await deepseek(d.name, d.text)
      const name = String(b?.name || d.name).trim().slice(0, 120)
      if (!name || existing.includes(name.toLowerCase())) { console.log('  ≡ skip', name); continue }
      existing.push(name.toLowerCase())
      const base = `marmaris-${slugify((b.builder && !slugify(name).includes(slugify(b.builder)) ? b.builder + ' ' : '') + name)}`.slice(0, 60).replace(/-$/, '')
      let s2 = base
      for (let n = 2; n <= 12; n++) { if (!(await (await fetch(`${SB}/rest/v1/boats?slug=eq.${s2}&select=id`, { headers: H })).json()).length) break; s2 = `${base}-${n}` }
      const row = {
        host_id: HOST, location_id: LOCATION, submission_id: SUBMISSION, name, slug: s2, status: 'draft',
        tagline: String(b.tagline ?? '').slice(0, 200) || null, description: String(b.description ?? '').slice(0, 5000) || null,
        type: b.type === 'catamaran' ? 'catamaran' : 'sailing',
        length_m: Number(b.length_m) > 0 ? Math.round(Number(b.length_m) * 10) / 10 : null,
        cabins: Number(b.cabins) > 0 ? Math.round(Number(b.cabins)) : null,
        capacity_pax: Math.min(200, Math.max(1, Math.round(Number(b.berths) || (Number(b.cabins) ? Number(b.cabins) * 2 + 2 : 8)))),
        builder: String(b.builder ?? '').slice(0, 80) || null,
        model_year: Number(b.model_year) >= 1980 && Number(b.model_year) <= 2030 ? Number(b.model_year) : null,
        departure_port: 'Marmaris Yacht Marina', min_hours: 168, pricing_type: 'hourly',
        includes_skipper: false, instant_book: false, cancellation_policy: 'moderate', updated_at: new Date().toISOString(),
      }
      const ins = await fetch(`${SB}/rest/v1/boats`, { method: 'POST', headers: { ...JH, Prefer: 'return=representation' }, body: JSON.stringify(row) })
      if (!ins.ok) { failed++; console.error('  ✗', name, (await ins.text()).slice(0, 100)); continue }
      const id = (await ins.json())[0].id
      const cur = 'EUR'
      if (Number(b.weekly_price) > 0) await fetch(`${SB}/rest/v1/boat_pricing`, { method: 'POST', headers: JH, body: JSON.stringify([{ boat_id: id, duration_hours: 168, price: Math.round(Number(b.weekly_price)), currency: cur }]) })
      const feats = (Array.isArray(b.features) ? b.features : []).map((f) => String(f).trim().slice(0, 60)).filter(Boolean).slice(0, 10)
      if (feats.length) await fetch(`${SB}/rest/v1/boat_features`, { method: 'POST', headers: JH, body: JSON.stringify(feats.map((f) => ({ boat_id: id, feature: f }))) })
      // rehost photos
      const rows = []
      for (let i = 0; i < d.imgs.slice(0, 8).length; i++) {
        try {
          const resp = await fetch(d.imgs[i], { headers: { 'User-Agent': 'Mozilla/5.0' } })
          if (!resp.ok || !(resp.headers.get('content-type') || '').startsWith('image/')) continue
          const bytes = Buffer.from(await resp.arrayBuffer())
          if (bytes.length < 8000) continue
          const path = `sk/${id}/${i}.jpg`
          const up = await fetch(`${SB}/storage/v1/object/boat-images/${path}`, { method: 'POST', headers: { ...H, 'Content-Type': 'image/jpeg', 'x-upsert': 'true' }, body: bytes })
          if (up.ok) rows.push({ boat_id: id, storage_url: `${SB}/storage/v1/object/public/boat-images/${path}`, alt: `${name} — sailing charter Marmaris`, sort_order: i, is_hero: i === 0 })
        } catch { /* skip */ }
      }
      if (rows.length) await fetch(`${SB}/rest/v1/boat_images`, { method: 'POST', headers: JH, body: JSON.stringify(rows) })
      created++
      console.log(`  ✓ ${name} (${row.type}, ${row.length_m}m, ${b.weekly_price ? '€' + b.weekly_price + '/wk' : 'POR'}, ${rows.length} photos) [${created}]`)
    } catch (e) { failed++; console.error('  ✗', slug, e.message?.slice(0, 90)) }
  }
}
await Promise.all(Array.from({ length: 3 }, worker))
console.log(`\nDONE: ${created} created, ${failed} failed of ${entries.length}`)
