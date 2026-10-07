#!/usr/bin/env node
// Definitive "no ad shows a logo" check: for EVERY active boat, resolve the card
// image exactly as the UI does (boat_images.find(is_hero) ?? lowest sort_order),
// download it, and save a labelled thumbnail to OUT_DIR for montage review. This
// catches ANY junk hero — logo/badge/blank — regardless of format or whether the
// image is shared across boats. Writes heroes.json (idx -> {name, slug, url, md5}).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const UA = 'Mozilla/5.0'
const OUT = process.env.OUT_DIR
mkdirSync(OUT, { recursive: true })

const boats = await (await fetch(`${SB}/rest/v1/boats?status=eq.active&select=id,name,slug&order=name&limit=2000`, { headers: H })).json()
console.error(`active boats: ${boats.length}`)
const meta = []
const CONC = 16
const q = boats.map((b, i) => ({ b, i }))
let done = 0
async function worker() {
  while (q.length) {
    const { b, i } = q.shift()
    const imgs = await (await fetch(`${SB}/rest/v1/boat_images?boat_id=eq.${b.id}&select=storage_url,is_hero,sort_order&order=sort_order`, { headers: H })).json()
    const hero = imgs.find((x) => x.is_hero) ?? imgs[0]
    if (!hero) { meta[i] = { name: b.name, slug: b.slug, url: null, note: 'NO_IMAGES' }; continue }
    try {
      const r = await fetch(hero.storage_url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) })
      const buf = Buffer.from(await r.arrayBuffer())
      const md5 = createHash('md5').update(buf).digest('hex')
      const ext = (hero.storage_url.split('.').pop() || 'jpg').split('?')[0].toLowerCase()
      writeFileSync(`${OUT}/${String(i).padStart(3, '0')}_${md5.slice(0, 6)}.${ext === 'jpeg' ? 'jpg' : ext}`, buf)
      meta[i] = { name: b.name, slug: b.slug, url: hero.storage_url, md5 }
    } catch { meta[i] = { name: b.name, slug: b.slug, url: hero.storage_url, note: 'FETCH_FAIL' } }
    if (++done % 60 === 0) console.error(`  ${done}/${boats.length}`)
  }
}
await Promise.all(Array.from({ length: CONC }, worker))
writeFileSync(`${OUT}/heroes.json`, JSON.stringify(meta, null, 1))
console.log(`heroes saved: ${meta.filter((m) => m && m.md5).length}; no-image: ${meta.filter((m) => m && m.note === 'NO_IMAGES').length}`)
