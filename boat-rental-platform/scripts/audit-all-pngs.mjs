#!/usr/bin/env node
// Junk hides as PNG (logos/badges/floorplans/price-cards) while real photos are
// JPG. Scan EVERY active boat's PNG images (even unique-per-boat ones the
// shared-hash audit misses), dedupe by md5, save a thumbnail per hash to OUT_DIR,
// and write png-hashes.json (hash -> {count, boatIds, sampleUrl}).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const UA = 'Mozilla/5.0'
const OUT = process.env.OUT_DIR
mkdirSync(OUT, { recursive: true })

const imgs = await (await fetch(`${SB}/rest/v1/boat_images?storage_url=ilike.*.png&select=boat_id,storage_url,is_hero&limit=5000`, { headers: H })).json()
console.error(`png image rows: ${imgs.length}`)
const map = new Map()
const CONC = 16
const q = [...imgs]
let done = 0
async function worker() {
  while (q.length) {
    const im = q.shift()
    try {
      const r = await fetch(im.storage_url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) })
      if (!r.ok) continue
      const buf = Buffer.from(await r.arrayBuffer())
      const hash = createHash('md5').update(buf).digest('hex')
      let e = map.get(hash)
      if (!e) { e = { boats: new Set(), sampleUrl: im.storage_url, buf, heroCount: 0 }; map.set(hash, e) }
      e.boats.add(im.boat_id)
      if (im.is_hero) e.heroCount++
    } catch {}
    if (++done % 60 === 0) console.error(`  ${done}/${imgs.length}`)
  }
}
await Promise.all(Array.from({ length: CONC }, worker))

const arr = [...map.entries()].sort((a, b) => b[1].heroCount - a[1].heroCount || b[1].boats.size - a[1].boats.size)
const out = {}
for (const [hash, e] of arr) {
  const fname = `h${e.heroCount}_b${String(e.boats.size).padStart(2, '0')}_${hash.slice(0, 8)}.png`
  writeFileSync(`${OUT}/${fname}`, e.buf)
  out[hash] = { boats: e.boats.size, heroCount: e.heroCount, sampleUrl: e.sampleUrl, boatIds: [...e.boats], file: fname }
}
writeFileSync(`${OUT}/png-hashes.json`, JSON.stringify(out, null, 1))
console.log(`distinct png hashes: ${arr.length} -> ${OUT}`)
