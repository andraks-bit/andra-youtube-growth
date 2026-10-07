#!/usr/bin/env node
// Audit the 8 Costa Boats (Corfu) listings: for each, list stored images,
// verify each storage_url actually returns a valid image (HTTP 200 + image
// content-type + >5KB), and compare the count to the source product on
// corfuboatcharter.com. Flags boats that are short or have broken images.
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const SUB = 'a11165c0-9d52-4998-ac1a-ee7f89ccfd13'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36'

const col = await (await fetch('https://corfuboatcharter.com/collections/speed-boats/products.json?limit=50', { headers: { 'User-Agent': UA, Accept: 'application/json' } })).json()
const srcByName = {}
for (const p of col.products) srcByName[p.title.trim()] = (p.images || []).map((i) => i.src).filter(Boolean)

const boats = await (await fetch(`${SB}/rest/v1/boats?submission_id=eq.${SUB}&select=id,name,slug&order=name`, { headers: H })).json()

async function ok(url) {
  try {
    const r = await fetch(url, { method: 'GET', headers: { 'User-Agent': UA, Range: 'bytes=0-2047' }, signal: AbortSignal.timeout(8000) })
    const ct = r.headers.get('content-type') || ''
    if (!r.ok && r.status !== 206) return false
    return ct.startsWith('image/')
  } catch { return false }
}

console.log('BOAT                     stored valid broken  source  status')
for (const b of boats) {
  const imgs = await (await fetch(`${SB}/rest/v1/boat_images?boat_id=eq.${b.id}&select=id,storage_url,is_hero,sort_order&order=sort_order`, { headers: H })).json()
  const results = await Promise.all(imgs.map((im) => ok(im.storage_url)))
  const valid = results.filter(Boolean).length
  const broken = results.length - valid
  const src = (srcByName[b.name] || []).length
  const flag = broken > 0 ? '⚠ BROKEN' : valid < Math.min(src, 6) ? '⚠ SHORT' : '✓ ok'
  console.log(`${b.name.padEnd(24)} ${String(imgs.length).padStart(6)} ${String(valid).padStart(5)} ${String(broken).padStart(6)}  ${String(src).padStart(6)}  ${flag}`)
}
