#!/usr/bin/env node
// Scrape Furious Nautisme (Mandelieu/Cannes) — the Savvas Voutirou lead.
// For each of the 11 boats: fetch its half-day page, extract the "From €X per
// half-day" price (= our 4h rate) and the full-size gallery images (the boat's
// own photo set, auto-detected as the largest same-prefix upload group).
// DRY prints a reconciliation table vs what's already in our DB. --apply then
// creates the missing Tempest 700 Prestige, updates 4h prices that differ, and
// tops up images on boats that are short.
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY, DS = env.DEEPSEEK_API_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const JH = { ...H, 'Content-Type': 'application/json' }
const APPLY = process.argv.includes('--apply')
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36'
const BASE = 'https://www.furiousnautisme.fr/en/details/'

const HOST = '72a6589c-d677-4720-b4c2-d1c69062c286'
const SUB = 'dc89252e-dd32-43ca-9fab-3638d52a071f'
const LOCATION = '51d08639-bc1d-401c-a783-bf4dec1ef157'
const PORT = 'Mandelieu, Cannes'

// DB name -> { slug of the half-day page, type, whether this boat is NEW }
const BOATS = [
  { name: 'Bayliner VR6 Prestige', slug: 'boat-bayliner-vr6-prestige-half-day-rentals', type: 'motor_yacht' },
  { name: 'Cap Camarat 650', slug: 'boat-cap-camarat-650-half-day-rentals', type: 'motor_yacht' },
  { name: 'Sun Cruiser 630', slug: 'boat-pacific-craft-630-sun-cruiser-half-day-rentals', type: 'motor_yacht' },
  { name: 'Pacific Craft Open 750', slug: 'boat-pacific-craft-open-750-half-day-rentals', type: 'motor_yacht' },
  { name: 'Capelli Tempest 630s', slug: 'boat-rigid-hulled-inflatable-capelli-tempest-630s-half-day-rentals', type: 'rib' },
  { name: 'Lomac 7.90 In', slug: 'boat-rigid-hulled-inflatable-lomac-7-90-in-prestige-half-day-rentals', type: 'rib' },
  { name: 'Ranieri Cayman 26 Sport Touring', slug: 'boat-rigid-hulled-inflatable-ranieri-cayman-26-sport-touring-half-day-rentals', type: 'rib' },
  { name: 'Tempest 700', slug: 'boat-rigid-hulled-inflatable-tempest-700-half-day-rentals', type: 'rib' },
  { name: 'Tempest 900', slug: 'boat-rigid-hulled-inflatable-tempest-900-half-day-rentals', type: 'rib' },
  { name: 'Tiger PROline 5.50', slug: 'boat-rigid-hulled-inflatable-tiger-proline-5-50-half-day-rentals', type: 'rib' },
  { name: 'Tempest 700 Prestige', slug: 'boat-rigid-hulled-inflatable-tempest-700-prestige-half-day-rentals', altSlug: 'boat-rigid-hulled-inflatable-tempest-700-prestige', type: 'rib', isNew: true },
]

async function fetchHtml(slug) {
  const r = await fetch(BASE + slug, { headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' }, redirect: 'follow', signal: AbortSignal.timeout(30000) })
  return r.ok ? r.text() : null
}

function parsePrice(html) {
  // The site writes the seasonal range inconsistently — "From €150 to €190"
  // (low→high) but also "From €490 to €280" (high→low). The customer-facing
  // "From" price is the LOWEST of the range, so take the min of both numbers.
  const num = (s) => Math.round(parseFloat(String(s).replace(/[.,]/g, '')))
  let m = html.match(/From\s*€\s*([\d.,]+)\s*to\s*€\s*([\d.,]+)\s*per half-day/i)
  if (m) return Math.min(num(m[1]), num(m[2]))
  m = html.match(/€\s*([\d.,]+)\s*per half-day/i) || html.match(/half-day[^€]{0,40}€\s*([\d.,]+)/i)
  return m ? num(m[1]) : null
}

function parseCapacity(html) {
  const m = html.match(/up to\s*(\d+)\s*(?:people|persons|passengers|pax)/i) || html.match(/(\d+)\s*(?:people|persons|passengers)/i)
  return m ? Math.min(30, Math.max(1, parseInt(m[1], 10))) : null
}

function parseImages(html) {
  const raw = [...html.matchAll(/https:\/\/www\.furiousnautisme\.fr\/wp-content\/uploads\/[^\s"')]+\.(?:jpg|jpeg|png|webp)/gi)].map((m) => m[0])
  const canon = new Set()
  for (let u of raw) {
    if (/bg-|favicon|logo|icon|cropped-|placeholder|avatar|sprite/i.test(u)) continue
    u = u.replace(/-\d+x\d+(\.(?:jpg|jpeg|png|webp))$/i, '$1') // strip size suffix
    canon.add(u)
  }
  // group by prefix (filename minus trailing -NN.ext); largest group = this boat's gallery
  const groups = {}
  for (const u of canon) {
    const key = u.replace(/-\d+\.(?:jpg|jpeg|png|webp)$/i, '').replace(/\/[^/]*$/, (s) => s.replace(/-?\d+$/, ''))
    const stem = u.replace(/\d+\.(jpg|jpeg|png|webp)$/i, '') // prefix up to the numbering
    ;(groups[stem] ??= []).push(u)
  }
  let best = []
  for (const arr of Object.values(groups)) if (arr.length > best.length) best = arr
  return best.sort().slice(0, 10)
}

async function deepseek(name, cap) {
  if (!DS) return null
  try {
    const r = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DS}` },
      body: JSON.stringify({ model: 'deepseek-chat', temperature: 0.3, max_tokens: 700, response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: 'You write charter copy for a rigid-hulled inflatable (RIB) rental in Mandelieu / Cannes, French Riviera. Return JSON {"tagline":string,"description":string}. tagline <=90 chars no exclamation marks. description 70-110 words, warm British English, second person, no em-dashes, no exclamation marks.' },
          { role: 'user', content: `Boat: ${name}${cap ? `, up to ${cap} people` : ''}. RIB day charter, Cannes bay / Lérins islands.` }] }),
      signal: AbortSignal.timeout(60000) })
    const j = await r.json(); return JSON.parse(j.choices[0].message.content)
  } catch { return null }
}

// existing DB boats
const dbBoats = await (await fetch(`${SB}/rest/v1/boats?submission_id=eq.${SUB}&select=id,name&order=name`, { headers: H })).json()
const byName = Object.fromEntries(dbBoats.map((b) => [b.name.toLowerCase(), b]))

console.log('BOAT                             site4h  db4h   siteImg  dbImg   action')
for (const cfg of BOATS) {
  let html = await fetchHtml(cfg.slug)
  if (!html && cfg.altSlug) html = await fetchHtml(cfg.altSlug)
  const price = html ? parsePrice(html) : null
  const imgs = html ? parseImages(html) : []
  const cap = html ? parseCapacity(html) : null
  const db = byName[cfg.name.toLowerCase()]
  let dbImg = 0, db4h = null
  if (db) {
    dbImg = (await (await fetch(`${SB}/rest/v1/boat_images?boat_id=eq.${db.id}&select=id`, { headers: H })).json()).length
    const pr = await (await fetch(`${SB}/rest/v1/boat_pricing?boat_id=eq.${db.id}&duration_hours=eq.4&select=price`, { headers: H })).json()
    db4h = pr[0]?.price ?? null
  }
  const action = !db ? 'CREATE' : (price && price !== db4h ? `4h €${db4h}->€${price}` : 'ok') + (dbImg < Math.min(imgs.length, 4) ? ` +imgs(${dbImg}->${imgs.length})` : '')
  console.log(`${cfg.name.padEnd(32)} ${String(price ?? '?').padStart(6)} ${String(db4h ?? '-').padStart(6)} ${String(imgs.length).padStart(7)} ${String(dbImg).padStart(6)}   ${action}`)
  cfg._ = { price, imgs, cap, db }

  if (APPLY) {
    if (!db) {
      const copy = await deepseek(cfg.name, cap)
      const row = { host_id: HOST, location_id: LOCATION, submission_id: SUB, name: cfg.name, slug: 'mandelieu-cannes-tempest-700-prestige', status: 'active', type: cfg.type, capacity_pax: cap || 10, departure_port: PORT, pricing_type: 'hourly', min_hours: 4, includes_skipper: false, instant_book: false, cancellation_policy: 'moderate', tagline: (copy?.tagline || `${cfg.name} RIB charter from Mandelieu, Cannes`).slice(0, 200), description: (copy?.description || null), updated_at: new Date().toISOString() }
      const ins = await fetch(`${SB}/rest/v1/boats`, { method: 'POST', headers: { ...JH, Prefer: 'return=representation' }, body: JSON.stringify(row) })
      if (!ins.ok) { console.error('   ✗ create failed', (await ins.text()).slice(0, 140)); continue }
      const id = (await ins.json())[0].id
      if (price) await fetch(`${SB}/rest/v1/boat_pricing`, { method: 'POST', headers: JH, body: JSON.stringify([{ boat_id: id, duration_hours: 4, price, currency: 'EUR', season: 'all' }]) })
      await rehost(id, cfg.name, imgs)
      console.log(`   ✓ created ${cfg.name} (${cap || 10} pax, 4h €${price})`)
    } else {
      if (price && price !== db4h) {
        const up = await fetch(`${SB}/rest/v1/boat_pricing?boat_id=eq.${db.id}&duration_hours=eq.4`, { method: 'PATCH', headers: JH, body: JSON.stringify({ price }) })
        if (up.ok) console.log(`   ✓ ${cfg.name}: 4h €${db4h} -> €${price}`)
      }
      if (dbImg < Math.min(imgs.length, 4) && imgs.length > dbImg) {
        await fetch(`${SB}/rest/v1/boat_images?boat_id=eq.${db.id}`, { method: 'DELETE', headers: H })
        await rehost(db.id, cfg.name, imgs)
        console.log(`   ✓ ${cfg.name}: re-imported ${imgs.length} images`)
      }
    }
  }
}

async function rehost(id, name, imgs) {
  let ok = 0
  for (let i = 0; i < imgs.length; i++) {
    try {
      const resp = await fetch(imgs[i], { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) })
      if (!resp.ok || !(resp.headers.get('content-type') || '').startsWith('image/')) continue
      const bytes = Buffer.from(await resp.arrayBuffer())
      if (bytes.length < 6000) continue
      const path = `furious/${id}/${i}.jpg`
      const up = await fetch(`${SB}/storage/v1/object/boat-images/${path}`, { method: 'POST', headers: { ...H, 'Content-Type': 'image/jpeg', 'x-upsert': 'true' }, body: bytes })
      if (up.ok) { await fetch(`${SB}/rest/v1/boat_images`, { method: 'POST', headers: JH, body: JSON.stringify([{ boat_id: id, storage_url: `${SB}/storage/v1/object/public/boat-images/${path}`, alt: `${name} — boat charter Mandelieu Cannes`, sort_order: ok, is_hero: ok === 0 }]) }); ok++ }
    } catch { /* skip */ }
  }
  return ok
}

console.log(`\n${APPLY ? 'APPLIED' : 'DRY RUN'}. ${APPLY ? '' : 'Re-run with --apply.'}`)
