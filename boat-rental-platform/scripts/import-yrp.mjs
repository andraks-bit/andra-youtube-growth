#!/usr/bin/env node
// Bulk import yacht-rental-phuket.com (~79 yachts) as DRAFTS under the
// existing "Yacht Charters Co. Ltd." lead. Mirrors the platform importer:
// fetch page → DeepSeek extract → normalize → insert + rehost photos.
// Skips boats the lead already has (fuzzy same-boat match). Two passes so
// site-furniture images (destination shots repeated on every page) are excluded.
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY, DS = env.DEEPSEEK_API_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const JH = { ...H, 'Content-Type': 'application/json' }
const UA = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }

const HOST = '72a6589c-d677-4720-b4c2-d1c69062c286'
const SUBMISSION = 'b9ccea2a-9e08-40e0-acb2-d13c6c425019' // Yacht Charters Co. Ltd. (Julian)
const LOCATION = '15ee58f8-1d63-44f8-a164-32488eac4e30'   // Phuket, Thailand

const urls = readFileSync('/tmp/yrp-urls.txt', 'utf8').split('\n').map((s) => s.trim()).filter(Boolean)

// ── fuzzy same-boat (numbers must match + a close word) ──
const NOISE = new Set(['yacht','boat','charter','the','phuket','rental','luxury','private','ft','feet'])
const toks = (name) => {
  const t = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').split(/\s+/).filter(Boolean)
  return { nums: t.filter((x) => /^\d+$/.test(x)).sort().join(','), words: t.filter((x) => !/^\d+$/.test(x) && x.length >= 3 && !NOISE.has(x)) }
}
const close = (a, b) => {
  if (a === b) return true
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0, j = 0, e = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue }
    if (++e > 1) return false
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++ }
  }
  return e + (a.length - i) + (b.length - j) <= 1
}
const sameBoat = (a, b) => {
  const ta = toks(a), tb = toks(b)
  if (ta.nums !== tb.nums) return false
  if (!ta.words.length && !tb.words.length) return ta.nums.length > 0
  return ta.words.some((w) => tb.words.some((v) => close(w, v)))
}

const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
const htmlToText = (h) => h.replace(/<(style|script)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, '\n')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#8211;|&ndash;/g, '-').replace(/\n{2,}/g, '\n').slice(0, 40000)

const pageImages = (h) => {
  const out = []
  const og = h.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/) || h.match(/content=["']([^"']+)["'][^>]*property=["']og:image["']/)
  if (og) out.push(og[1])
  for (const m of h.matchAll(/https:\/\/www\.yacht-rental-phuket\.com\/wp-content\/uploads\/[^\s"'\\)]+?\.(?:jpe?g|png|webp)/gi)) {
    const u = m[0]
    if (!/-\d+x\d+\.(jpe?g|png|webp)$/i.test(u) && !out.includes(u)) out.push(u) // skip resized variants
  }
  return out.slice(0, 30)
}

const EXTRACT = `You extract boat/yacht charter listings from the text of a web page.
Return JSON: {"boats":[{"name":string,"type":string,"length_m":number|null,"capacity_pax":number,"cabins":number|null,"builder":string|null,"model_year":number|null,"departure_port":string|null,"currency":string,"prices":[{"duration_hours":number,"price":number}],"features":[string],"tagline":string,"description":string}]}
Rules:
- This is a single yacht's detail page — return exactly ONE boat.
- type: one of motor_yacht, catamaran, sailing, speedboat, fishing, rib, luxury, jet_ski, gulet.
- length_m in metres (convert feet: ft × 0.3048, one decimal).
- prices: half day → duration_hours 4; day charter → 8; overnight/multi-day → 24 × days. Numbers only. If no numeric price, empty array.
- currency: 3-letter code from what the page states (฿ = THB, $ = USD). Prices on this site are usually THB.
- features: up to 12 short amenity lines. tagline: one line max 90 chars, no exclamation marks.
- description: 100-180 words, warm British English, second person, only facts from the page, no em-dashes, no exclamation marks.`

async function deepseek(text, url) {
  const r = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DS}` },
    body: JSON.stringify({ model: 'deepseek-chat', temperature: 0.2, max_tokens: 2600, response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: EXTRACT }, { role: 'user', content: `URL: ${url}\n\nPAGE TEXT:\n${text}` }] }),
    signal: AbortSignal.timeout(90000),
  })
  const j = await r.json()
  return JSON.parse(j.choices[0].message.content).boats?.[0]
}

// existing boats under the lead (skip fuzzy matches)
const existing = (await (await fetch(`${SB}/rest/v1/boats?select=name&submission_id=eq.${SUBMISSION}`, { headers: H })).json()).map((b) => b.name)
console.log(`fleet pages: ${urls.length} · already listed: ${existing.length}`)

// ── pass 1: fetch all pages, build image frequency map ──
const pages = []
const freq = new Map()
let fi = 0
async function fetchWorker() {
  while (fi < urls.length) {
    const url = urls[fi++]
    try {
      const h = await (await fetch(url, { headers: UA, signal: AbortSignal.timeout(30000) })).text()
      const imgs = pageImages(h)
      imgs.forEach((u) => freq.set(u, (freq.get(u) ?? 0) + 1))
      pages.push({ url, text: htmlToText(h), imgs })
    } catch (e) { console.error('fetch fail', url, e.message) }
  }
}
await Promise.all(Array.from({ length: 8 }, fetchWorker))
console.log(`fetched ${pages.length} pages`)

// ── pass 2: extract + import ──
let created = 0, skipped = 0, failed = 0
let pi = 0
async function importWorker() {
  while (pi < pages.length) {
    const p = pages[pi++]
    try {
      const b = await deepseek(p.text, p.url)
      if (!b?.name) { failed++; continue }
      const name = String(b.name).trim().slice(0, 120)
      if (existing.some((n) => sameBoat(n, name))) { skipped++; console.log(`  ≡ skip (already listed): ${name}`); continue }
      existing.push(name)

      const base = `phuket-${slugify((b.builder && !slugify(name).includes(slugify(b.builder)) ? b.builder + ' ' : '') + name)}`.slice(0, 60).replace(/-$/, '')
      let slug = base
      for (let n = 2; n <= 12; n++) {
        if (!(await (await fetch(`${SB}/rest/v1/boats?slug=eq.${slug}&select=id`, { headers: H })).json()).length) break
        slug = `${base}-${n}`
      }
      const cur = /^[A-Z]{3}$/.test(String(b.currency ?? '').toUpperCase()) ? b.currency.toUpperCase() : 'THB'
      const seen = new Set()
      const pricing = (Array.isArray(b.prices) ? b.prices : [])
        .map((x) => ({ duration_hours: Math.round(Number(x.duration_hours)), price: Math.round(Number(x.price)) }))
        .filter((x) => x.duration_hours >= 1 && x.duration_hours <= 720 && x.price > 0 && x.price < 10_000_000)
        .filter((x) => !seen.has(x.duration_hours) && seen.add(x.duration_hours)).slice(0, 6)

      const row = {
        host_id: HOST, location_id: LOCATION, submission_id: SUBMISSION, name, slug, status: 'draft',
        tagline: String(b.tagline ?? '').slice(0, 200) || null, description: String(b.description ?? '').slice(0, 5000) || null,
        type: ['motor_yacht','catamaran','sailing','speedboat','fishing','rib','luxury','jet_ski','gulet'].includes(b.type) ? b.type : 'motor_yacht',
        length_m: Number(b.length_m) > 0 ? Number(b.length_m) : null,
        capacity_pax: Math.min(200, Math.max(1, Math.round(Number(b.capacity_pax) || 8))),
        cabins: Number(b.cabins) > 0 ? Math.round(Number(b.cabins)) : null,
        builder: String(b.builder ?? '').slice(0, 80) || null,
        departure_port: String(b.departure_port ?? '').slice(0, 120) || 'Phuket',
        min_hours: pricing.length ? Math.min(...pricing.map((x) => x.duration_hours)) : 4,
        pricing_type: 'hourly', includes_skipper: true, instant_book: false, cancellation_policy: 'flexible',
        updated_at: new Date().toISOString(),
      }
      const ins = await fetch(`${SB}/rest/v1/boats`, { method: 'POST', headers: { ...JH, Prefer: 'return=representation' }, body: JSON.stringify(row) })
      if (!ins.ok) { failed++; console.error(`  ✗ ${name}: ${(await ins.text()).slice(0, 120)}`); continue }
      const id = (await ins.json())[0].id

      if (pricing.length) await fetch(`${SB}/rest/v1/boat_pricing`, { method: 'POST', headers: JH, body: JSON.stringify(pricing.map((x) => ({ boat_id: id, ...x, currency: cur }))) })
      const feats = (Array.isArray(b.features) ? b.features : []).map((f) => String(f).trim().slice(0, 60)).filter(Boolean).slice(0, 12)
      if (feats.length) await fetch(`${SB}/rest/v1/boat_features`, { method: 'POST', headers: JH, body: JSON.stringify(feats.map((f) => ({ boat_id: id, feature: f }))) })

      // photos: page-specific only (site furniture appears on ≥4 pages)
      const own = p.imgs.filter((u) => (freq.get(u) ?? 0) < 4).slice(0, 8)
      const rows = []
      for (let i = 0; i < own.length; i++) {
        try {
          const resp = await fetch(own[i], { headers: UA, signal: AbortSignal.timeout(30000) })
          if (!resp.ok || !(resp.headers.get('content-type') || '').startsWith('image/')) continue
          const bytes = Buffer.from(await resp.arrayBuffer())
          if (bytes.length < 8000) continue
          const path = `yrp/${id}/${i}.jpg`
          const up = await fetch(`${SB}/storage/v1/object/boat-images/${path}`, { method: 'POST', headers: { ...H, 'Content-Type': 'image/jpeg', 'x-upsert': 'true' }, body: bytes })
          if (up.ok) rows.push({ boat_id: id, storage_url: `${SB}/storage/v1/object/public/boat-images/${path}`, alt: `${name} — yacht charter Phuket`, sort_order: i, is_hero: i === 0 })
        } catch { /* skip bad image */ }
      }
      if (rows.length) await fetch(`${SB}/rest/v1/boat_images`, { method: 'POST', headers: JH, body: JSON.stringify(rows) })
      created++
      console.log(`  ✓ ${name} (${slug}) — ${pricing.length} prices ${cur}, ${rows.length} photos [${created + skipped + failed}/${pages.length}]`)
    } catch (e) { failed++; console.error('  ✗', p.url, e.message?.slice(0, 100)) }
  }
}
await Promise.all(Array.from({ length: 3 }, importWorker))
console.log(`\nDONE: ${created} created, ${skipped} already listed, ${failed} failed of ${pages.length} pages`)
