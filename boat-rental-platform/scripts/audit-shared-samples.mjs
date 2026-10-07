#!/usr/bin/env node
// Comprehensive junk-image sweep: hash every active boat's images, and for every
// hash shared across >1 boat, save ONE sample thumbnail to OUT_DIR named by
// count+hash so a human can eyeball graphics/badges/logos vs real photos in a
// single montage. Writes shared-hashes.json (hash -> {count, boatIds, sampleUrl, ext}).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const UA = 'Mozilla/5.0'
const OUT = process.env.OUT_DIR
mkdirSync(OUT, { recursive: true })

const boats = await (await fetch(`${SB}/rest/v1/boats?status=eq.active&select=id,name&order=name&limit=2000`, { headers: H })).json()
const hashMap = new Map() // hash -> {count, boatIds:Set, sampleUrl, ext, buf}
const CONC = 14
const q = [...boats]
let done = 0
async function md5buf(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) })
  if (!r.ok) return null
  const buf = Buffer.from(await r.arrayBuffer())
  return { hash: createHash('md5').update(buf).digest('hex'), buf }
}
async function worker() {
  while (q.length) {
    const b = q.shift()
    const imgs = await (await fetch(`${SB}/rest/v1/boat_images?boat_id=eq.${b.id}&select=storage_url&order=sort_order`, { headers: H })).json()
    for (const im of imgs) {
      try {
        const res = await md5buf(im.storage_url)
        if (!res) continue
        let e = hashMap.get(res.hash)
        if (!e) { e = { count: 0, boatIds: new Set(), sampleUrl: im.storage_url, ext: (im.storage_url.split('.').pop() || '').toLowerCase(), buf: res.buf }; hashMap.set(res.hash, e) }
        e.boatIds.add(b.id)
        e.count = e.boatIds.size
      } catch {}
    }
    if (++done % 40 === 0) console.error(`  ${done}/${boats.length}`)
  }
}
await Promise.all(Array.from({ length: CONC }, worker))

const shared = [...hashMap.entries()].filter(([, e]) => e.boatIds.size > 1).sort((a, b) => b[1].boatIds.size - a[1].boatIds.size)
const out = {}
for (const [hash, e] of shared) {
  const fname = `${String(e.boatIds.size).padStart(3, '0')}_${hash.slice(0, 8)}.${e.ext === 'jpeg' ? 'jpg' : e.ext}`
  writeFileSync(`${OUT}/${fname}`, e.buf)
  out[hash] = { count: e.boatIds.size, ext: e.ext, sampleUrl: e.sampleUrl, boatIds: [...e.boatIds], file: fname }
}
writeFileSync(`${OUT}/shared-hashes.json`, JSON.stringify(out, null, 1))
console.log(`shared hashes: ${shared.length}; thumbnails written to ${OUT}`)
console.log(shared.map(([h, e]) => `${String(e.boatIds.size).padStart(3)}  ${h.slice(0, 8)}  .${e.ext}`).join('\n'))
