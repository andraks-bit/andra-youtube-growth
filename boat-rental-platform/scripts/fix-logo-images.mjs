#!/usr/bin/env node
// Remove the PRIMABOATS ship's-wheel LOGO (md5 803626b4…) from every boat that
// has it as a photo, then promote the next real photo to hero so the listing
// card shows a real boat image. DRY-RUN by default; pass --apply to execute.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const HJSON = { ...H, 'Content-Type': 'application/json' }
const UA = 'Mozilla/5.0'
// Known junk images (provider logos / promo badges / blank placeholders) used as
// boat photos. All confirmed by eye via scripts/audit-shared-samples.mjs montage.
const JUNK = new Set([
  // provider / third-party logos
  '803626b4636662ed438586e7ee749e40', // PRIMABOATS ship's-wheel logo
  '638a08306f647fc547b38088db79ba6d', // "ELISA" brand logo
  'fa8cecb7662a2c10c6783fa7b6fe841c', // "Corfu Cruises" logo
  '4ac311eacf09b23200dd299642ab54eb', // "SANTANNA LUXURY SUITES" logo
  '26aa708ebefd68f4bd1505a6705a5faa', // "My Dolce Vita Cruise" logo
  '27476e1093dad7e5c747eba2b466263d', // "My Dolce Vita Cruise" logo (variant)
  '6e306204aa8aff5b25509d43e19a0b97', // "My Dolce Vita Cruise" logo (variant)
  '337e673902066b227eef7ca5ec0412de', // "DORADO" logo
  '605d76927ba16c7b01368d229c45b8d0', // "DORADO" logo (variant)
  '38ee1e948c440d231e987d59bce07473', // "Turismo de Portugal" logo
  'd415592da458c196d0cd55c4e6182b5c', // "Viator" logo
  '4fbdd7022f90eb476f07cbeabb5272bf', // "Financiado por la Unión Europea" banner
  '59b3c58d06723e3f45d83e8d3f9edb35', // EU "Co-funded by the European Union / ESPA" banner
  '133cf538aa934dbdd801316e0c24a50b', // "Plan de Recuperación..." EU recovery banner
  // promo badges / marketing cards (not boat photos)
  'b9b14665a54e87db0f0ee895422d28f9', // "POR TIEMPO LIMITADO" promo badge
  '42862535575b7c4da351954b124f9870', // "Lisbon Catamaran Tours" price/menu card
  'cd1082be721b21f910c5937663b1e648', // "Rhodes Private Yacht Experience" promo card
  '74276a9e1bd426c49fd25b8a27dc672f', // Tripadvisor "Travelers' Choice 2022" badge
  'b6c114c09b59c4c7c312fd6c1abb8f2a', // Tripadvisor "Travelers' Choice 2023" badge
  'c6c640c07af7d3ea175ee2b2075f3cb4', // Tripadvisor "Travelers' Choice 2021" badge
  'db8f0f14f9cce1d3d8d5a3ee5563be29', // cartoon pig/turtle marketing collage
  // deck-plan diagram / marketing overlays / spec-card heroes (found via hero sweep)
  'f4a749ab236d2ae6def6534126fc255a', // Adele — catamaran deck-plan diagram (hero)
  '1241d0666903fc941a7ecc10ea9b64a0', // "Fairline Targa 43'" marketing banner
  'f2af10b178e2f9c6a1d592adfe51c187', // champagne + Tripadvisor "2026" badge + member card
  '174e29f07e1266a8c71b8c9cccb87780', // "#1 Sailing Cruise in the World" award overlay
  '007e906e860a9fdcf0eab3b13f34d446', // speedboat photo with "Google reviews" badge banner
  // blanks / placeholders
  'ee0fce82f88391a2da1b7bc8d7aed0ca', // pure black image
  '66f0969d4f1037bf055831d687efc012', // black decorative ring
  '9bcd9b7eb35dad4f6d5ca91f53660656', // gray-circles blank placeholder
  '5600a5014b1c0328eddd60e8d0dbb25d', // "Simone" contact-person selfie (jpg)
])
const APPLY = process.argv.includes('--apply')
const BUCKET_PREFIX = '/storage/v1/object/public/boat-images/'

async function md5(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) })
    if (!r.ok) return null
    return createHash('md5').update(Buffer.from(await r.arrayBuffer())).digest('hex')
  } catch { return null }
}

const boats = await (await fetch(`${SB}/rest/v1/boats?status=eq.active&select=id,name,slug&order=name&limit=2000`, { headers: H })).json()
console.log(APPLY ? '*** APPLY MODE ***\n' : '*** DRY RUN (no changes) — pass --apply to execute ***\n')

let fixed = 0
for (const b of boats) {
  const imgs = await (await fetch(`${SB}/rest/v1/boat_images?boat_id=eq.${b.id}&select=id,storage_url,sort_order,is_hero&order=sort_order`, { headers: H })).json()
  const withHash = []
  for (const im of imgs) withHash.push({ ...im, hash: await md5(im.storage_url) })
  const logos = withHash.filter((im) => JUNK.has(im.hash))
  if (!logos.length) continue
  const remaining = withHash.filter((im) => im.hash && !JUNK.has(im.hash)) // real images left
  if (!remaining.length) { console.log(`SKIP ${b.name} — would leave 0 images`); continue }

  const newHero = remaining.slice().sort((a, c) => (a.sort_order ?? 0) - (c.sort_order ?? 0))[0]
  console.log(`${b.name.padEnd(30)} del ${logos.length} logo → hero=${newHero.storage_url.split('/').pop()} (${remaining.length} real remain)`)

  if (APPLY) {
    for (const lg of logos) {
      // delete DB row
      const d = await fetch(`${SB}/rest/v1/boat_images?id=eq.${lg.id}`, { method: 'DELETE', headers: H })
      if (!d.ok) { console.log(`   ! row delete failed ${d.status}`); continue }
      // delete storage object
      const path = lg.storage_url.split(BUCKET_PREFIX)[1]
      if (path) {
        const s = await fetch(`${SB}/storage/v1/object/boat-images/${path}`, { method: 'DELETE', headers: H })
        if (!s.ok && s.status !== 404) console.log(`   ! storage delete ${s.status} ${path}`)
      }
    }
    // clear hero on all, set hero on the new one
    await fetch(`${SB}/rest/v1/boat_images?boat_id=eq.${b.id}`, { method: 'PATCH', headers: HJSON, body: JSON.stringify({ is_hero: false }) })
    const p = await fetch(`${SB}/rest/v1/boat_images?id=eq.${newHero.id}`, { method: 'PATCH', headers: HJSON, body: JSON.stringify({ is_hero: true }) })
    if (!p.ok) console.log(`   ! hero set failed ${p.status}`)
  }
  fixed++
}
console.log(`\n${APPLY ? 'Fixed' : 'Would fix'}: ${fixed} boats`)
