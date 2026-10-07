#!/usr/bin/env node
// Re-photo Ivan's 11 Hvar boats: pull each boat's OWN photos from the
// hvarexcursions deals page, copy them onto BoatHire24 storage, and replace
// the boat's images. Matches boat -> photo folder by name tokens.
//   node scripts/fix-ivan-images.mjs           # dry run — show boat -> folder map
//   node scripts/fix-ivan-images.mjs --apply   # rehost + replace images
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY
const APPLY = process.argv.includes('--apply')
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const JH = { ...H, 'Content-Type': 'application/json' }
const PAGE = 'https://www.hvarexcursions.com/en/best-rental-deals-in-hvar'
const IVAN = '04039f43-2e95-40c6-afd5-ba2d06aac2e7'
const slugify = (s) => (s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

// 1) Scrape per-boat photo folders from the page.
const html = await (await fetch(PAGE, { headers: { 'User-Agent': 'Mozilla/5.0' } })).text()
const raw = new Set()
for (const m of html.matchAll(/(https?:\/\/[^"'\s)]*?\/img\/rentals\/photos\/[^"'\s)]+?\.(?:jpe?g|png|webp))/gi)) raw.add(m[1])
for (const m of html.matchAll(/["'(](\/img\/rentals\/photos\/[^"'\s)]+?\.(?:jpe?g|png|webp))/gi)) raw.add('https://www.hvarexcursions.com' + m[1])
const folders = {}
for (const u of raw) { const m = u.match(/\/img\/rentals\/photos\/([^/]+)\//); if (m) (folders[m[1]] ??= new Set()).add(u) }
for (const f in folders) folders[f] = [...folders[f]].sort()

// Folders that are land vehicles — never match a boat.
const VEHICLES = /aprilia|honda-vision|vespa|smart|vw-up|scooter|moped|quad|^car/i

// 2) Ivan's boats.
const boats = await (await fetch(`${SB}/rest/v1/boats?select=id,name&submission_id=eq.${IVAN}&order=name.asc`, { headers: H })).json()

// 3) Match each boat to its best folder by shared name tokens.
function pickFolder(name) {
  const toks = slugify(name).split(' ').filter((t) => t.length >= 3 || /^\d{2,}$/.test(t))
  let best = null, bestScore = 0
  for (const f of Object.keys(folders)) {
    if (VEHICLES.test(f)) continue
    const fl = f.toLowerCase()
    const score = toks.reduce((s, t) => s + (fl.includes(t) ? 1 : 0), 0)
    if (score > bestScore) { bestScore = score; best = f }
  }
  return bestScore > 0 ? best : null
}

const plan = boats.map((b) => ({ ...b, folder: pickFolder(b.name) }))
console.log('Boat → photo folder:\n')
for (const p of plan) console.log(`  ${p.name.padEnd(22)} → ${p.folder ?? '❌ no match'} (${p.folder ? folders[p.folder].length : 0} photos)`)
const unmatched = plan.filter((p) => !p.folder)
if (unmatched.length) console.log(`\n⚠ ${unmatched.length} unmatched`)

if (!APPLY) { console.log('\nDry run. Re-run with --apply to rehost + replace images.'); process.exit(0) }

// 4) Rehost each boat's photos and replace boat_images.
let done = 0
for (const p of plan) {
  if (!p.folder) continue
  const urls = folders[p.folder]
  const finals = []
  for (let i = 0; i < urls.length; i++) {
    try {
      const resp = await fetch(encodeURI(decodeURI(urls[i])), { headers: { 'User-Agent': 'Mozilla/5.0' } })
      if (!resp.ok) { console.error('  dl fail', urls[i], resp.status); continue }
      const ct = resp.headers.get('content-type') || 'image/jpeg'
      const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg'
      const bytes = Buffer.from(await resp.arrayBuffer())
      const path = `rentals/${p.id}/${i}.${ext}`
      const up = await fetch(`${SB}/storage/v1/object/boat-images/${path}`, { method: 'POST', headers: { ...H, 'Content-Type': ct, 'x-upsert': 'true' }, body: bytes })
      if (!up.ok) { console.error('  up fail', path, await up.text()); continue }
      finals.push(`${SB}/storage/v1/object/public/boat-images/${path}`)
    } catch (e) { console.error('  err', urls[i], e.message) }
  }
  if (!finals.length) { console.log(`  ${p.name}: no photos rehosted, keeping existing`); continue }
  // Replace images: delete old, insert new.
  await fetch(`${SB}/rest/v1/boat_images?boat_id=eq.${p.id}`, { method: 'DELETE', headers: JH })
  await fetch(`${SB}/rest/v1/boat_images`, { method: 'POST', headers: JH, body: JSON.stringify(finals.map((u, i) => ({ boat_id: p.id, storage_url: u, alt: p.name, sort_order: i, is_hero: i === 0 }))) })
  done++; console.log(`  ✓ ${p.name}: ${finals.length} photos`)
}
console.log(`\nUpdated photos on ${done} boats.`)
