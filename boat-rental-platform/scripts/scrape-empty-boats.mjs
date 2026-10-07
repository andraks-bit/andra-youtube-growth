#!/usr/bin/env node
// Re-scrape real photos for the 3 listings left with only junk after the logo/
// badge purge (MUSE, Bahamas Turtle & Pig tour, Sea Starlight). Per-boat source
// page + image filter. DRY-RUN by default (writes previews); --apply imports.
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const HJSON = { ...H, 'Content-Type': 'application/json' }
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125.0 Safari/537.36'
const APPLY = process.argv.includes('--apply')
const PREVIEW = process.env.PREVIEW_DIR

const BOATS = [
  { slug: 'labuan-bajo-harbour-labuan-bajo-flores-east-nusa-tenggara-2',
    pages: ['https://elisaspeedboat.com/about-muse/'], keep: /Muse-Boat-/i, cap: 12 },
  { slug: 'nassau-bahamas-turtle-pig-island-tour',
    pages: ['https://bahamasfuncharters.com/our-photo-gallery/'], keep: /uploads\//i, drop: /logo|banner|favicon|captain/i, cap: 12 },
  { slug: 'san-yago-charter-marina-de-vigo-rua-as-avenidas-vigo-2',
    pages: ['https://sanyagocharter.com/product/sea-starlight-top/', 'https://sanyagocharter.com/sea-starlight-galicia/'], keep: /SeaS|Starlight/i, drop: /Faldon|-100x100|logo/i, cap: 12, heroPrefer: /intro/i },
]
const FULL = (u) => u.replace(/-\d+x\d+(?=\.\w+(\?|$))/i, '')

async function dl(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  const ct = r.headers.get('content-type') || ''
  const buf = Buffer.from(await r.arrayBuffer())
  return { buf, ct, md5: createHash('md5').update(buf).digest('hex') }
}

console.log(APPLY ? '*** APPLY ***\n' : '*** DRY RUN — pass --apply ***\n')
for (const cfg of BOATS) {
  const boat = (await (await fetch(`${SB}/rest/v1/boats?slug=eq.${cfg.slug}&select=id,name`, { headers: H })).json())[0]
  if (!boat) { console.log('?? no boat', cfg.slug); continue }
  const urls = new Set()
  for (const p of cfg.pages) {
    const html = await (await fetch(p, { headers: { 'User-Agent': UA } })).text()
    const re = /https:\/\/[^" )]+\/wp-content\/uploads\/[^" )]+\.(?:jpe?g|png|webp)/gi
    for (const m of html.match(re) || []) {
      if (cfg.keep.test(m) && !(cfg.drop && cfg.drop.test(m))) urls.add(FULL(m))
    }
  }
  const good = []
  for (const u of [...urls]) {
    try {
      const { buf, ct, md5 } = await dl(u)
      if (!ct.startsWith('image/') || buf.length < 10000) continue
      if (good.some((g) => g.md5 === md5)) continue
      good.push({ url: u, buf, ct, md5, ext: (u.split('.').pop() || 'jpg').split('?')[0].toLowerCase() })
    } catch {}
  }
  if (cfg.heroPrefer) good.sort((a, b) => (cfg.heroPrefer.test(b.url) ? 1 : 0) - (cfg.heroPrefer.test(a.url) ? 1 : 0))
  if (cfg.cap) good.length = Math.min(good.length, cfg.cap)
  console.log(`${boat.name.slice(0, 34).padEnd(34)} candidates=${urls.size} usable=${good.length}`)
  if (PREVIEW && good[0]) writeFileSync(`${PREVIEW}/empty_${cfg.slug.slice(0, 20)}.${good[0].ext === 'jpeg' ? 'jpg' : good[0].ext}`, good[0].buf)

  if (APPLY && good.length) {
    // delete ALL existing images (they were confirmed junk-only)
    const ex = await (await fetch(`${SB}/rest/v1/boat_images?boat_id=eq.${boat.id}&select=id,storage_url`, { headers: H })).json()
    for (const im of ex) {
      await fetch(`${SB}/rest/v1/boat_images?id=eq.${im.id}`, { method: 'DELETE', headers: H })
      const path = im.storage_url.split('/storage/v1/object/public/boat-images/')[1]
      if (path) await fetch(`${SB}/storage/v1/object/boat-images/${path}`, { method: 'DELETE', headers: H })
    }
    const rows = []
    for (let i = 0; i < good.length; i++) {
      const g = good[i]
      const path = `boats/${boat.id}/src-${g.md5.slice(0, 8)}-${i}.${g.ext === 'jpeg' ? 'jpg' : g.ext}`
      const up = await fetch(`${SB}/storage/v1/object/boat-images/${path}`, { method: 'POST', headers: { ...H, 'Content-Type': g.ct, 'x-upsert': 'true' }, body: g.buf })
      if (!up.ok) { console.log(`  ! upload ${up.status}`); continue }
      rows.push({ boat_id: boat.id, storage_url: `${SB}/storage/v1/object/public/boat-images/${path}`, alt: `${boat.name} photo ${i + 1}`, sort_order: i, is_hero: i === 0 })
    }
    if (rows.length) {
      const ins = await fetch(`${SB}/rest/v1/boat_images`, { method: 'POST', headers: HJSON, body: JSON.stringify(rows) })
      console.log(`  imported ${rows.length} ${ins.ok ? 'OK' : '! ' + ins.status}`)
    }
  }
}
