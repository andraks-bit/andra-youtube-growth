#!/usr/bin/env node
// For a given content-hash (a known provider logo), list every boat that has an
// image with that hash, and how many OTHER (non-logo) images each boat has —
// so we know which boats keep real photos after deleting the logo and which
// would be left with none.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const UA = 'Mozilla/5.0'
const LOGO = process.argv[2] || '803626b4636662ed438586e7ee749e40'

async function md5(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) })
    if (!r.ok) return null
    return createHash('md5').update(Buffer.from(await r.arrayBuffer())).digest('hex')
  } catch { return null }
}

const boats = await (await fetch(`${SB}/rest/v1/boats?status=eq.active&select=id,name,slug,submission_id&order=name&limit=2000`, { headers: H })).json()
console.log(`hash ${LOGO}\n`)
console.log('BOAT                           LOGO REAL  submission               logo_image_ids')
const affected = []
const CONC = 12
const q = [...boats]
async function worker() {
  while (q.length) {
    const b = q.shift()
    const imgs = await (await fetch(`${SB}/rest/v1/boat_images?boat_id=eq.${b.id}&select=id,storage_url,sort_order,is_hero&order=sort_order`, { headers: H })).json()
    let logoIds = [], real = 0
    for (const im of imgs) {
      const h = await md5(im.storage_url)
      if (h === LOGO) logoIds.push(im.id); else if (h) real++
    }
    if (logoIds.length) affected.push({ b, logoIds, real, total: imgs.length })
  }
}
await Promise.all(Array.from({ length: CONC }, worker))
affected.sort((a, c) => a.real - c.real || a.b.name.localeCompare(c.b.name))
for (const a of affected) {
  console.log(`${a.b.name.slice(0, 30).padEnd(30)} ${String(a.logoIds.length).padStart(4)} ${String(a.real).padStart(4)}  ${String(a.b.submission_id || '-').slice(0, 22).padEnd(22)} ${a.logoIds.join(',')}`)
}
console.log(`\nAffected boats: ${affected.length}`)
console.log(`  with real photos remaining after logo removal: ${affected.filter((a) => a.real > 0).length}`)
console.log(`  would be LEFT WITH ZERO images: ${affected.filter((a) => a.real === 0).length}`)
console.log('\nLOGO_IMAGE_IDS=' + affected.flatMap((a) => a.logoIds).join(','))
console.log('ZERO_IMG_BOATS=' + affected.filter((a) => a.real === 0).map((a) => a.b.slug).join(','))
