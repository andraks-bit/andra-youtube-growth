#!/usr/bin/env node
// Find boats whose photos are actually a provider's LOGO placeholder (e.g. the
// RIMABOATS ship's-wheel). Logo images are byte-identical across many boats, so
// we hash every image and flag hashes that repeat across >1 boat.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125.0 Safari/537.36'

// All active boats
const boats = await (await fetch(`${SB}/rest/v1/boats?status=eq.active&select=id,name,slug,departure_port,submission_id&order=name&limit=2000`, { headers: H })).json()
console.error(`active boats: ${boats.length}`)

async function md5(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) })
    if (!r.ok) return { err: `HTTP ${r.status}` }
    const buf = Buffer.from(await r.arrayBuffer())
    return { hash: createHash('md5').update(buf).digest('hex'), size: buf.length }
  } catch (e) { return { err: String(e).slice(0, 40) } }
}

const hashToBoats = new Map()   // hash -> Set(boatId)
const hashSize = new Map()
const boatImgs = new Map()       // boatId -> [{id, url, hash}]
let done = 0
const CONC = 12
const queue = [...boats]
async function worker() {
  while (queue.length) {
    const b = queue.shift()
    const imgs = await (await fetch(`${SB}/rest/v1/boat_images?boat_id=eq.${b.id}&select=id,storage_url,sort_order&order=sort_order`, { headers: H })).json()
    const rec = []
    for (const im of imgs) {
      const { hash, size } = await md5(im.storage_url)
      if (hash) {
        if (!hashToBoats.has(hash)) hashToBoats.set(hash, new Set())
        hashToBoats.get(hash).add(b.id)
        hashSize.set(hash, size)
      }
      rec.push({ id: im.id, url: im.storage_url, hash })
    }
    boatImgs.set(b.id, rec)
    if (++done % 25 === 0) console.error(`  hashed ${done}/${boats.length}`)
  }
}
await Promise.all(Array.from({ length: CONC }, worker))

// Hashes shared by >1 boat = suspected placeholder/logo
const shared = [...hashToBoats.entries()].filter(([, s]) => s.size > 1).sort((a, b) => b[1].size - a[1].size)
console.log('\n=== IMAGE HASHES SHARED ACROSS MULTIPLE BOATS (suspected logo/placeholder) ===')
for (const [hash, set] of shared) {
  const sampleBoat = boats.find((b) => set.has(b.id))
  const sampleImg = boatImgs.get(sampleBoat.id).find((r) => r.hash === hash)
  console.log(`${hash}  boats=${String(set.size).padStart(3)}  size=${hashSize.get(hash)}  e.g. ${sampleImg.url}`)
}

// Boats whose ENTIRE image set is shared/placeholder (no unique real photo)
const sharedHashes = new Set(shared.map(([h]) => h))
const logoBoats = boats.filter((b) => {
  const rec = boatImgs.get(b.id) || []
  const withHash = rec.filter((r) => r.hash)
  return withHash.length > 0 && withHash.every((r) => sharedHashes.has(r.hash))
})
console.log(`\n=== BOATS WITH ONLY SHARED/LOGO IMAGES (no real photo): ${logoBoats.length} ===`)
for (const b of logoBoats) console.log(`${b.name.padEnd(30)} ${b.slug.padEnd(34)} ${b.departure_port || ''}`)

// Also: boats where at least one (but not all) image is a shared logo
const mixed = boats.filter((b) => {
  const rec = (boatImgs.get(b.id) || []).filter((r) => r.hash)
  const s = rec.filter((r) => sharedHashes.has(r.hash)).length
  return s > 0 && s < rec.length
})
console.log(`\n=== BOATS WITH SOME (not all) shared/logo images: ${mixed.length} ===`)
for (const b of mixed) {
  const rec = (boatImgs.get(b.id) || []).filter((r) => r.hash)
  const s = rec.filter((r) => sharedHashes.has(r.hash)).length
  console.log(`${b.name.padEnd(30)} ${s}/${rec.length} shared  ${b.slug}`)
}
