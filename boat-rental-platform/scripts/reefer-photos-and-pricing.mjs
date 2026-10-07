#!/usr/bin/env node
// Reefer fleet finishing pass:
//  • upload the collage-cropped photos (from Kareem's email) to each boat
//  • Reefer Boat: REPLACE existing photos (he asked to swap them)
//  • add the 7-day tier (168h) from his full email
//  • add features: techniques + extras (gear rental, mother boat, transport, video)
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const JH = { ...H, 'Content-Type': 'application/json' }
const SP = '/private/tmp/claude-501/-Users-master-boat-rental-marbella/8d2bc1b0-3274-436a-a898-a82bbdc8701e/scratchpad'

const BOATS = [
  { slug: 'hurghada-reefer-sport-fishing', id: 'c3dbb3cf-564a-444e-9678-eaaf8c18e0b6', panels: ['reefer-p0','reefer-p1','reefer-p2','reefer-p3'], seven: 3500, replace: true, alt: 'Reefer Boat — Sea Hunt Triton 20ft, Hurghada' },
  { slug: 'el-gouna-reefer-x-boat', panels: ['reefer-x-p0','reefer-x-p1','reefer-x-p2'], seven: 4200, replace: false, alt: 'Reefer X Boat — Wahoo EFS 26ft, El Gouna' },
  { slug: 'safaga-reefer-xl-boat', panels: ['reefer-xl-p0','reefer-xl-p1','reefer-xl-p2','reefer-xl-p3'], seven: 5600, replace: false, alt: 'Reefer XL Boat — VIGA Ultra 30ft, Somabay' },
]
const FEATURES = [
  'Jigging, popping & casting', 'Trolling & bottom fishing', 'Live bait fishing',
  'Drinks & snacks included', 'Professional guiding included',
  'Fishing gear rental €50/person/day', 'Mother boat available €650/day',
  'Transfers: car €50/day · minibus €100/day', 'Videography €100/day',
]

for (const b of BOATS) {
  // resolve id from slug when not pinned
  let id = b.id
  if (!id) {
    const r = await (await fetch(`${SB}/rest/v1/boats?select=id&slug=eq.${b.slug}`, { headers: H })).json()
    if (!r.length) { console.error('not found:', b.slug); continue }
    id = r[0].id
  }
  if (b.replace) await fetch(`${SB}/rest/v1/boat_images?boat_id=eq.${id}`, { method: 'DELETE', headers: JH })
  const rows = []
  for (let i = 0; i < b.panels.length; i++) {
    const bytes = readFileSync(`${SP}/${b.panels[i]}.jpg`)
    const path = `reefer/${id}/${i}.jpg`
    const up = await fetch(`${SB}/storage/v1/object/boat-images/${path}`, { method: 'POST', headers: { ...H, 'Content-Type': 'image/jpeg', 'x-upsert': 'true' }, body: bytes })
    if (!up.ok) { console.error('upload fail', path, await up.text()); continue }
    rows.push({ boat_id: id, storage_url: `${SB}/storage/v1/object/public/boat-images/${path}`, alt: b.alt, sort_order: i, is_hero: i === 0 })
  }
  if (rows.length) await fetch(`${SB}/rest/v1/boat_images`, { method: 'POST', headers: JH, body: JSON.stringify(rows) })

  // 7-day tier (168h) — add if missing
  const pr = await (await fetch(`${SB}/rest/v1/boat_pricing?select=duration_hours&boat_id=eq.${id}`, { headers: H })).json()
  if (!pr.some((p) => p.duration_hours === 168)) {
    await fetch(`${SB}/rest/v1/boat_pricing`, { method: 'POST', headers: JH, body: JSON.stringify([{ boat_id: id, duration_hours: 168, price: b.seven, currency: 'EUR' }]) })
  }
  // features — replace with the canonical set
  await fetch(`${SB}/rest/v1/boat_features?boat_id=eq.${id}`, { method: 'DELETE', headers: JH })
  await fetch(`${SB}/rest/v1/boat_features`, { method: 'POST', headers: JH, body: JSON.stringify(FEATURES.map((f) => ({ boat_id: id, feature: f }))) })
  console.log(`✓ ${b.slug}: ${rows.length} photos${b.replace ? ' (replaced old)' : ''}, 7-day tier €${b.seven}, ${FEATURES.length} features`)
}
console.log('Done.')
