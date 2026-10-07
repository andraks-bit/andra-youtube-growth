#!/usr/bin/env node
// Backfill pretty slugs for every existing boat.
//   • writes lib/slug-redirects.json  (old slug → new slug) so already-shared /
//     indexed URLs 301 forward forever (no DB table needed)
//   • PATCHes boats.slug to the new keyword-rich slug via the REST API
//
//   node scripts/backfill-slugs.mjs           # dry run — prints the mapping
//   node scripts/backfill-slugs.mjs --apply   # writes the map + updates slugs
//
// Reads SUPABASE creds from .env.local.
import { readFileSync, writeFileSync } from 'node:fs'

const root = new URL('../', import.meta.url)
const env = Object.fromEntries(
  readFileSync(new URL('.env.local', root), 'utf8')
    .split('\n').filter((l) => l.includes('=')).map((l) => {
      const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
const APPLY = process.argv.includes('--apply')
const MAP_ONLY = process.argv.includes('--map-only')  // write the map, don't flip slugs yet
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

function slugify(s) {
  return (s || '').toLowerCase().normalize('NFKD')
    .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}
function buildBoatSlug({ city, builder, name }) {
  const seen = new Set(); const parts = []
  for (const raw of [city, builder, name]) {
    if (!raw) continue
    const words = slugify(raw).split('-').filter((w) => w && !seen.has(w))
    if (!words.length) continue
    words.forEach((w) => seen.add(w)); parts.push(words.join('-'))
  }
  let slug = parts.join('-')
  if (slug.length > 60) slug = slug.slice(0, 60).replace(/-[^-]*$/, '')
  return slug || 'boat'
}

const boats = await (await fetch(
  `${URL_}/rest/v1/boats?select=id,name,builder,slug,created_at,locations(city)&order=created_at.asc`,
  { headers: H },
)).json()

const used = new Set()
const changes = []
for (const b of boats) {
  const base = buildBoatSlug({ city: b.locations?.city, builder: b.builder, name: b.name })
  let slug = base; let n = 1
  while (used.has(slug)) { n += 1; slug = `${base}-${n}` }
  used.add(slug)
  if (slug !== b.slug) changes.push({ id: b.id, old: b.slug, new: slug })
}

console.log(`${boats.length} boats · ${changes.length} slugs will change\n`)
for (const c of changes.slice(0, 200)) console.log(`  ${c.old}\n    → ${c.new}`)

if (!APPLY && !MAP_ONLY) { console.log('\nDry run. Re-run with --map-only then --apply.'); process.exit(0) }

// 1) Persist the redirect map (merge with any existing entries).
const mapPath = new URL('lib/slug-redirects.json', root)
const existing = JSON.parse(readFileSync(mapPath, 'utf8'))
for (const c of changes) existing[c.old] = c.new
writeFileSync(mapPath, JSON.stringify(existing, null, 2) + '\n')
console.log(`\nWrote ${Object.keys(existing).length} redirects → lib/slug-redirects.json`)

if (MAP_ONLY) { console.log('Map written. Deploy, then run --apply to flip slugs.'); process.exit(0) }

// 2) Flip each boat's slug.
let upd = 0
for (const c of changes) {
  const r = await fetch(`${URL_}/rest/v1/boats?id=eq.${c.id}`, {
    method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' },
    body: JSON.stringify({ slug: c.new }),
  })
  if (r.ok) upd++; else console.error('slug update fail', c.id, await r.text())
}
console.log(`Applied: ${upd}/${changes.length} slugs updated.`)
