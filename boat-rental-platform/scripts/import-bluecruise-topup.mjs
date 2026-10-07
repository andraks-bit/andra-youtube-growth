#!/usr/bin/env node
// Top-up for the Blue Cruise Bodrum import:
//  1. Append the operator's own Bella Mare photos from the shared Google Drive
//     folder (5 originals) after the site gallery, md5-deduped.
//  2. Re-fetch the one Wicked Felina site photo (#25) that timed out on import.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter((l) => l.includes('=') && !l.trimStart().startsWith('#'))
  .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const JH = { ...H, 'Content-Type': 'application/json' }
const UA = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36', 'Accept': 'image/avif,image/webp,*/*', 'Referer': 'https://www.bluecruisebodrum.com/' }

const BELLA = '0df5592e-f92f-489c-a9c1-d410f26c05cd'
const FELINA = '8d5691d1-c5ad-4554-93f6-a25a6fe2a4b3'

// Bella Mare originals from the shared Drive folder "Bella Mare Gulet"
const DRIVE = [
  '1RL3z9DYgDE9fTRV3k9E1XJ6XiI2AeaQl', // 000.jpg
  '1W6wR_iuoiVuqr9mNAkThVpROqJaTj8Qp', // 001 (1).jpg
  '1vkp1xdnuUOqL6bixf5aTUvgSnxEjbhpw', // 001 (2).jpg
  '1ZV_eOxs3AF-FpwnIdd5RN_lSyEObi9lN', // 001 (3).jpg
  '1UL90aJftYUsS89CuKcpa02V40vP5-e8R', // 001 (4).jpg
]

const get = (p) => fetch(`${SB}/rest/v1/${p}`, { headers: H }).then((r) => r.json())

async function existingImages(boatId) {
  const rows = await get(`boat_images?boat_id=eq.${boatId}&select=storage_url,sort_order&order=sort_order`)
  const hashes = new Set()
  for (const r of rows) {
    try {
      const resp = await fetch(r.storage_url, { signal: AbortSignal.timeout(30000) })
      if (resp.ok) hashes.add(createHash('md5').update(Buffer.from(await resp.arrayBuffer())).digest('hex'))
    } catch {}
  }
  const maxSort = rows.reduce((m, r) => Math.max(m, r.sort_order ?? 0), -1)
  return { hashes, nextSort: maxSort + 1 }
}

async function upload(boatId, bytes, i, alt, folder) {
  const path = `bluecruise/${boatId}/${folder}${i}.jpg`
  const up = await fetch(`${SB}/storage/v1/object/boat-images/${path}`, { method: 'POST', headers: { ...H, 'Content-Type': 'image/jpeg', 'x-upsert': 'true' }, body: bytes })
  if (!up.ok) { console.error('  upload fail', await up.text()); return null }
  return { boat_id: boatId, storage_url: `${SB}/storage/v1/object/public/boat-images/${path}`, alt, sort_order: i, is_hero: false }
}

// ── 1. Bella Mare Drive originals ──
{
  const { hashes, nextSort } = await existingImages(BELLA)
  console.log(`Bella Mare: ${hashes.size} existing photos hashed, next sort_order ${nextSort}`)
  let i = nextSort; const rows = []; const seen = new Set(hashes)
  for (const id of DRIVE) {
    try {
      const resp = await fetch(`https://drive.google.com/uc?export=download&id=${id}`, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(40000) })
      if (!resp.ok || !(resp.headers.get('content-type') || '').startsWith('image/')) { console.log(`  skip ${id}: ${resp.status} ${resp.headers.get('content-type')}`); continue }
      const bytes = Buffer.from(await resp.arrayBuffer())
      const hash = createHash('md5').update(bytes).digest('hex')
      if (seen.has(hash)) { console.log(`  = dup ${id} (${bytes.length}b) — already in gallery`); continue }
      seen.add(hash)
      const row = await upload(BELLA, bytes, i, 'Bella Mare — gulet charter Bodrum', 'drive-')
      if (row) { rows.push(row); console.log(`  + added Drive ${id} (${bytes.length}b) at sort ${i}`); i++ }
    } catch (e) { console.error('  drive fail', id, e.message?.slice(0, 60)) }
  }
  if (rows.length) await fetch(`${SB}/rest/v1/boat_images`, { method: 'POST', headers: JH, body: JSON.stringify(rows) })
  console.log(`Bella Mare: +${rows.length} Drive photos`)
}

// ── 2. Wicked Felina missing site photo #25 ──
{
  const { hashes, nextSort } = await existingImages(FELINA)
  const resp = await fetch('https://www.bluecruisebodrum.com/img/wicked-felina/25.jpg', { headers: UA, signal: AbortSignal.timeout(40000) })
  if (resp.ok && (resp.headers.get('content-type') || '').startsWith('image/')) {
    const bytes = Buffer.from(await resp.arrayBuffer())
    const hash = createHash('md5').update(bytes).digest('hex')
    if (hashes.has(hash)) { console.log('Wicked Felina #25: already present (dup)') }
    else {
      const row = await upload(FELINA, bytes, nextSort, 'Wicked Felina — gulet charter Bodrum', '')
      if (row) { await fetch(`${SB}/rest/v1/boat_images`, { method: 'POST', headers: JH, body: JSON.stringify([row]) }); console.log(`Wicked Felina: +1 photo (#25) at sort ${nextSort}`) }
    }
  } else console.log('Wicked Felina #25 not reachable:', resp.status)
}
console.log('\nTop-up done.')
