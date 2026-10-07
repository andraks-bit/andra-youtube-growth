#!/usr/bin/env node
// Enrich Tempest 900 (Savvas lead) — its source gallery has ~9 photos named
// inconsistently (location-bateau-mandelieu-0N + Tempest-900 named), but we only
// stored 2. Verified those filenames appear ONLY on the Tempest 900 page (not
// generic). Re-import the full set with byte-hash dedup so no duplicate photos.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const JH = { ...H, 'Content-Type': 'application/json' }
const APPLY = process.argv.includes('--apply')
const SUB = 'dc89252e-dd32-43ca-9fab-3638d52a071f'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36'

const html = await (await fetch('https://www.furiousnautisme.fr/en/details/boat-rigid-hulled-inflatable-tempest-900-half-day-rentals/', { headers: { 'User-Agent': UA } })).text()
// Tempest 900's own photos only
const all = [...html.matchAll(/https:\/\/www\.furiousnautisme\.fr\/wp-content\/uploads\/[^\s"')]+\.(?:jpg|jpeg|png)/gi)].map((m) => m[0])
const urls = [...new Set(all
  .filter((u) => /mandelieu-0\d|semi-rigide-tempest-900/i.test(u))
  .filter((u) => !/-scaled\./i.test(u))          // drop the -scaled twin of each photo
  .map((u) => u.replace(/-\d+x\d+(\.\w+)$/i, '$1')) // strip size variants
)]
console.log(`Found ${urls.length} candidate Tempest 900 photos:`)
urls.forEach((u) => console.log('  ', u.split('/').pop()))

const boat = (await (await fetch(`${SB}/rest/v1/boats?submission_id=eq.${SUB}&name=eq.Tempest%20900&select=id`, { headers: H })).json())[0]
if (!APPLY) { console.log('\nDRY RUN — re-run with --apply'); process.exit(0) }

// download + byte-hash dedupe
const seen = new Set(); const keep = []
for (const u of urls) {
  try {
    const r = await fetch(u, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) })
    if (!r.ok || !(r.headers.get('content-type') || '').startsWith('image/')) continue
    const bytes = Buffer.from(await r.arrayBuffer())
    if (bytes.length < 6000) continue
    const h = createHash('md5').update(bytes).digest('hex')
    if (seen.has(h)) { console.log('   ≡ dup skip', u.split('/').pop()); continue }
    seen.add(h); keep.push(bytes)
  } catch { /* skip */ }
}
console.log(`\n${keep.length} unique photos after byte-hash dedup`)
await fetch(`${SB}/rest/v1/boat_images?boat_id=eq.${boat.id}`, { method: 'DELETE', headers: H })
let ok = 0
for (const bytes of keep) {
  const path = `furious/${boat.id}/${ok}.jpg`
  const up = await fetch(`${SB}/storage/v1/object/boat-images/${path}`, { method: 'POST', headers: { ...H, 'Content-Type': 'image/jpeg', 'x-upsert': 'true' }, body: bytes })
  if (up.ok) { await fetch(`${SB}/rest/v1/boat_images`, { method: 'POST', headers: JH, body: JSON.stringify([{ boat_id: boat.id, storage_url: `${SB}/storage/v1/object/public/boat-images/${path}`, alt: 'Tempest 900 — RIB charter Mandelieu Cannes', sort_order: ok, is_hero: ok === 0 }]) }); ok++ }
}
console.log(`✓ Tempest 900 now has ${ok} photos (1 hero)`)
