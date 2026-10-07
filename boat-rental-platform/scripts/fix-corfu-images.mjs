#!/usr/bin/env node
// Fix Corfu boats that are short on photos: re-import the FULL image set from
// the matching corfuboatcharter.com product. Deletes the boat's existing image
// rows and rehosts every source photo fresh (ordered, one hero), so no dupes.
// Currently only Mostro Rib (2 → 8 from protagon-aias-copy) is short.
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const JH = { ...H, 'Content-Type': 'application/json' }
const APPLY = process.argv.includes('--apply')
const SUB = 'a11165c0-9d52-4998-ac1a-ee7f89ccfd13'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36'

const col = await (await fetch('https://corfuboatcharter.com/collections/speed-boats/products.json?limit=50', { headers: { 'User-Agent': UA, Accept: 'application/json' } })).json()
const srcByName = {}
for (const p of col.products) srcByName[p.title.trim()] = (p.images || []).map((i) => i.src).filter(Boolean)

const boats = await (await fetch(`${SB}/rest/v1/boats?submission_id=eq.${SUB}&select=id,name&order=name`, { headers: H })).json()

for (const b of boats) {
  const cur = await (await fetch(`${SB}/rest/v1/boat_images?boat_id=eq.${b.id}&select=id`, { headers: H })).json()
  const src = srcByName[b.name] || []
  if (cur.length >= Math.min(src.length, 6) || src.length === 0) continue // already fine
  console.log(`${APPLY ? 'FIX' : 'DRY'} ${b.name}: ${cur.length} → re-import ${src.length} from source`)
  if (!APPLY) continue

  // delete existing rows, then rehost the full source set fresh
  await fetch(`${SB}/rest/v1/boat_images?boat_id=eq.${b.id}`, { method: 'DELETE', headers: H })
  let ok = 0
  for (let i = 0; i < src.length; i++) {
    try {
      const resp = await fetch(src[i], { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) })
      if (!resp.ok || !(resp.headers.get('content-type') || '').startsWith('image/')) continue
      const bytes = Buffer.from(await resp.arrayBuffer())
      if (bytes.length < 6000) continue
      const path = `corfu/${b.id}/m${i}.jpg`
      const up = await fetch(`${SB}/storage/v1/object/boat-images/${path}`, { method: 'POST', headers: { ...H, 'Content-Type': 'image/jpeg', 'x-upsert': 'true' }, body: bytes })
      if (up.ok) { await fetch(`${SB}/rest/v1/boat_images`, { method: 'POST', headers: JH, body: JSON.stringify([{ boat_id: b.id, storage_url: `${SB}/storage/v1/object/public/boat-images/${path}`, alt: `${b.name} — speedboat charter Corfu`, sort_order: ok, is_hero: ok === 0 }]) }); ok++ }
    } catch { /* skip */ }
  }
  console.log(`   ✓ ${b.name} now has ${ok} photos (1 hero)`)
}
console.log(APPLY ? '\nDONE.' : '\nDRY RUN. Re-run with --apply.')
