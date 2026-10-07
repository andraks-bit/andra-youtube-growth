#!/usr/bin/env node
// Re-scrape real photo galleries from primaboats.com for the PRIMA BOATS listings
// that were imported with only a logo + a contact-person headshot (no boat photos).
// Downloads the gallery, dedupes, and (with --apply) rehosts to Supabase storage +
// inserts boat_images rows with a real hero. DRY-RUN by default.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const HJSON = { ...H, 'Content-Type': 'application/json' }
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125.0 Safari/537.36'
const APPLY = process.argv.includes('--apply')
const PREVIEW_DIR = process.env.PREVIEW_DIR

// DB slug  ->  primaboats portfolio slug
const MAP = {
  'prima-boats-avinguda-s-almudaina-8-07157-port-d-andratx-7': 'azimut-53-fly',
  'prima-boats-avinguda-s-almudaina-8-07157-port-d-andratx': 'chris-craft-28-corsair',
  'mallorca-avinguda-s-almudaina-8-07157-port-d-andratx-illes-2': 'marlin-rib-38',
  'mallorca-avinguda-s-almudaina-8-07157-port-d-andratx-illes-17': 'custom-royal-yacht-150-my-foners',
  'mallorca-avinguda-s-almudaina-8-07157-port-d-andratx-illes-7': 'san-lorenzo-sx76',
}
const JUNK = /logo|fav|flag|contact|avatar|icon|topo|placeholder|-\d+x\d+\./i
const LOGO_MD5 = '803626b4636662ed438586e7ee749e40'
const HEAD_MD5 = '5600a5014b1c0328eddd60e8d0dbb25d'

function extractGallery(html) {
  const urls = new Set()
  const re = /<img[^>]+(?:src|data-src)="([^"]+wp-content\/uploads\/[^"]+\.(?:jpe?g|png|webp))"/gi
  let m
  while ((m = re.exec(html))) {
    let u = m[1].replace(/^http:/, 'https:')
    if (!JUNK.test(u)) urls.add(u)
  }
  return [...urls]
}

async function dl(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const ct = r.headers.get('content-type') || ''
  const buf = Buffer.from(await r.arrayBuffer())
  return { buf, ct, md5: createHash('md5').update(buf).digest('hex') }
}

console.log(APPLY ? '*** APPLY MODE ***\n' : '*** DRY RUN — pass --apply to execute ***\n')
for (const [dbSlug, srcSlug] of Object.entries(MAP)) {
  const boat = (await (await fetch(`${SB}/rest/v1/boats?slug=eq.${dbSlug}&select=id,name`, { headers: H })).json())[0]
  if (!boat) { console.log(`?? no boat for ${dbSlug}`); continue }
  const page = await (await fetch(`https://www.primaboats.com/en/portfolio/${srcSlug}/`, { headers: { 'User-Agent': UA } })).text()
  const gallery = extractGallery(page)
  const good = []
  for (const u of gallery) {
    try {
      const { buf, ct, md5 } = await dl(u)
      if (!ct.startsWith('image/') || buf.length < 8000) continue
      if (md5 === LOGO_MD5 || md5 === HEAD_MD5) continue
      if (good.some((g) => g.md5 === md5)) continue
      good.push({ url: u, buf, ct, md5, ext: (u.split('.').pop() || 'jpg').split('?')[0].toLowerCase() })
    } catch { /* skip */ }
  }
  console.log(`${boat.name.padEnd(24)} src=${srcSlug.padEnd(34)} gallery=${gallery.length} usable=${good.length}`)
  if (PREVIEW_DIR && good[0]) {
    const { writeFileSync } = await import('node:fs')
    writeFileSync(`${PREVIEW_DIR}/prima_${srcSlug}.${good[0].ext}`, good[0].buf)
  }

  if (APPLY && good.length) {
    // remove existing junk (logo + headshot) rows first
    const existing = await (await fetch(`${SB}/rest/v1/boat_images?boat_id=eq.${boat.id}&select=id,storage_url`, { headers: H })).json()
    for (const im of existing) {
      const path = im.storage_url.split('/storage/v1/object/public/boat-images/')[1]
      let isJunk = false
      try { const { md5 } = await dl(im.storage_url); isJunk = md5 === LOGO_MD5 || md5 === HEAD_MD5 } catch {}
      if (isJunk) {
        await fetch(`${SB}/rest/v1/boat_images?id=eq.${im.id}`, { method: 'DELETE', headers: H })
        if (path) await fetch(`${SB}/storage/v1/object/boat-images/${path}`, { method: 'DELETE', headers: H })
      }
    }
    // upload gallery
    const rows = []
    for (let i = 0; i < good.length; i++) {
      const g = good[i]
      const path = `boats/${boat.id}/prima-${g.md5.slice(0, 8)}-${i}.${g.ext === 'jpeg' ? 'jpg' : g.ext}`
      const up = await fetch(`${SB}/storage/v1/object/boat-images/${path}`, {
        method: 'POST', headers: { ...H, 'Content-Type': g.ct, 'x-upsert': 'true' }, body: g.buf,
      })
      if (!up.ok) { console.log(`   ! upload ${up.status} ${path}`); continue }
      rows.push({ boat_id: boat.id, storage_url: `${SB}/storage/v1/object/public/boat-images/${path}`, alt: `${boat.name} photo ${i + 1}`, sort_order: i, is_hero: i === 0 })
    }
    if (rows.length) {
      const ins = await fetch(`${SB}/rest/v1/boat_images`, { method: 'POST', headers: HJSON, body: JSON.stringify(rows) })
      console.log(`   inserted ${rows.length} images ${ins.ok ? 'OK' : '! ' + ins.status + ' ' + (await ins.text())}`)
    }
  }
}
