#!/usr/bin/env node
/**
 * normalize-locations.mjs — clean up the ~22 locations that still store a raw
 * geocoded address in `locations.city` (and therefore an unrankable geocoded
 * `slug`). Two actions per location:
 *
 *   RENAME  — no clean-named twin exists → update city + slug in place.
 *   MERGE   — a clean-named location already exists (usually an empty shell, but
 *             sometimes with a few boats) → move this location's boats onto it,
 *             then delete this row. This also fixes the Corfu-style "empty shell
 *             shadows the live one" bug at the data level.
 *
 * Every change records old-slug → new-slug in lib/location-redirects.json so the
 * app can 301 the dead geocoded URLs (wired separately in app/[location]/page.tsx).
 *
 * SAFE BY DEFAULT: dry-run only. It reads with the anon key, prints the full
 * proposal, and writes the redirect map — but touches NO database rows.
 *
 *   node scripts/normalize-locations.mjs            # dry-run (default)
 *   node scripts/normalize-locations.mjs --apply    # writes DB — needs SUPABASE_SERVICE_ROLE_KEY
 *
 * The clean names below are proposals for owner review — edit CURATED before
 * applying. Anything not in CURATED falls back to prettyCity(city) + a slug.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const APPLY = process.argv.includes('--apply')

// ── env ──────────────────────────────────────────────────────────────────────
const env = {}
for (const line of readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#') || !t.includes('=')) continue
  const [k, ...v] = t.split('=')
  env[k] = v.join('=').trim().replace(/^["']|["']$/g, '')
}
const URL = env.NEXT_PUBLIC_SUPABASE_URL
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY
const KEY = APPLY ? SERVICE : ANON
if (APPLY && !SERVICE) {
  console.error('✗ --apply needs SUPABASE_SERVICE_ROLE_KEY (env or .env.local). Aborting.')
  process.exit(1)
}

async function rest(path, init = {}) {
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  })
  if (!res.ok) throw new Error(`${res.status} ${await res.text()} on ${path}`)
  return res.status === 204 ? null : res.json()
}

const prettyCity = (c) => (c ? c.split(',')[0].trim() || c.trim() : '')
const slugify = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

// ── Curated clean names (owner-reviewable). Keyed by a distinctive slug fragment.
// city = display name, slug = target URL slug. Omit a key to use the fallback.
const CURATED = {
  'port-hercule': { city: 'Monaco', slug: 'monaco' },
  'mallorca-avinguda-s-almudaina': { city: "Port d'Andratx", slug: 'port-dandratx' },
  'prima-boats-avinguda': { city: "Port d'Andratx", slug: 'port-dandratx' },
  'vilamoura-marina': { city: 'Vilamoura', slug: 'vilamoura' },
  'marina-de-vilamoura': { city: 'Vilamoura', slug: 'vilamoura' },
  'puerto-deportivo-tomas-maestre': { city: 'La Manga', slug: 'la-manga' },
  'la-manga-murcia': { city: 'La Manga', slug: 'la-manga' },
  'ocean-power-boat-club-cape-town': { city: 'Cape Town', slug: 'cape-town' },
  'marina-di-rimini': { city: 'Rimini', slug: 'rimini' },
  'no-9-international-port-ngoc-chau': { city: 'Ha Long Bay', slug: 'ha-long-bay' },
  'ibiza-departure-point-confirmed': { city: 'Ibiza', slug: 'ibiza' },
  'obala-nona-croatia': { city: 'Zadar', slug: 'zadar', review: 'Obala Nona — confirm city (Zadar?)' },
  'club-maritimo-san-antonio-de-la-playa': { city: 'Palma de Mallorca', slug: 'palma-de-mallorca' },
  'maribel-departure-marina': { city: 'Palma de Mallorca', slug: 'palma-de-mallorca', review: 'Maribel — confirm marina (Palma?)' },
  'deep-water-harbour-st-john': { city: "St. John's", slug: 'st-johns-antigua' },
  'marina-de-vilamoura-8125': { city: 'Vilamoura', slug: 'vilamoura' },
  'split-riva-split-harbour': { city: 'Split', slug: 'split' },
  'marina-cap-cana-punta-cana': { city: 'Punta Cana', slug: 'punta-cana' },
  'parc-vaira-i-puna-auia-tahiti': { city: 'Tahiti', slug: 'tahiti' },
  'nassau-bahamas': { city: 'Nassau', slug: 'nassau' },
  'marina-de-valencia': { city: 'Valencia', slug: 'valencia' },
  'san-yago-charter-marina-de-vigo': { city: 'Vigo', slug: 'vigo' },
  'korcula-town-aci-marina': { city: 'Korčula', slug: 'korcula' },
  'marina-de-lagos': { city: 'Lagos', slug: 'lagos-portugal' },
  'makenzi-fishing-harbor': { city: 'Larnaca', slug: 'larnaca' },
  'larnaca-cyprus': { city: 'Larnaca', slug: 'larnaca' },
  'via-marittima-1-3-5-catania': { city: 'Catania', slug: 'catania' },
  'cran-canaria-puerto-rico-bass': { city: 'Gran Canaria', slug: 'gran-canaria' },
  'tahiti-papeete-port': { city: 'Tahiti', slug: 'tahiti' },
  'medulin-croatia': { city: 'Medulin', slug: 'medulin' },
}
// Longest fragment first so specific keys (…-8125) win over generic (marina-de-vilamoura).
const CURATED_KEYS = Object.keys(CURATED).sort((a, b) => b.length - a.length)
const curatedFor = (slug) => {
  for (const frag of CURATED_KEYS) if (slug.includes(frag)) return CURATED[frag]
  return null
}

// ── main ─────────────────────────────────────────────────────────────────────
const locations = await rest('locations?select=id,slug,name,city,country&limit=2000')
const boats = await rest('boats?select=location_id&status=eq.active&limit=5000')
const boatCount = new Map()
for (const b of boats) boatCount.set(b.location_id, (boatCount.get(b.location_id) || 0) + 1)

const isGarbage = (c) => !!c && (c.includes(',') || c.length > 25)
const bySlug = new Map(locations.map((l) => [l.slug, l]))

const targets = locations
  .filter((l) => isGarbage(l.city))
  .map((l) => {
    const cur = curatedFor(l.slug)
    const cleanCity = cur?.city || prettyCity(l.city)
    const cleanSlug = cur?.slug || slugify(prettyCity(l.city))
    const stillGarbage = cleanSlug.length > 30 || /[:*()"]/.test(cleanCity)
    return { ...l, n: boatCount.get(l.id) || 0, cleanCity, cleanSlug, review: cur?.review || (stillGarbage ? 'no curated mapping — fallback name looks wrong, add to CURATED' : null) }
  })

// Group every target by its final clean slug so intra-plan collisions become
// merges, not duplicate-slug writes. One canonical row per slug: an existing
// clean-named location if one owns the slug, else the highest-boat garbage row
// (which gets RENAMEd); everyone else in the group MERGEs into it.
const groups = new Map()
for (const t of targets) (groups.get(t.cleanSlug) || groups.set(t.cleanSlug, []).get(t.cleanSlug)).push(t)

const plan = []
for (const [cleanSlug, members] of groups) {
  members.sort((a, b) => b.n - a.n)
  const twin = bySlug.get(cleanSlug)
  const twinIsMember = twin && members.some((m) => m.id === twin.id)
  const canonical = twin && !twinIsMember
    ? { id: twin.id, boats: boatCount.get(twin.id) || 0, existing: true }
    : { id: members[0].id, boats: members[0].n, existing: false }
  for (const m of members) {
    const isRename = !canonical.existing && m.id === canonical.id
    plan.push({
      id: m.id, oldSlug: m.slug, oldCity: m.city, country: m.country, n: m.n,
      action: isRename ? 'RENAME' : 'MERGE', cleanCity: m.cleanCity, cleanSlug,
      twinId: isRename ? null : canonical.id,
      twinBoats: isRename ? null : canonical.boats,
      review: m.review,
    })
  }
}
plan.sort((a, b) => b.n - a.n)

// ── report ───────────────────────────────────────────────────────────────────
console.log(`\n${APPLY ? '⚙️  APPLY' : '🔍 DRY-RUN'} — ${plan.length} geocoded locations (${plan.reduce((s, p) => s + p.n, 0)} active boats)\n`)
for (const p of plan) {
  const tag = p.action === 'MERGE' ? `MERGE→${p.cleanSlug} (twin has ${p.twinBoats})` : `RENAME→${p.cleanSlug}`
  console.log(`  [${p.n.toString().padStart(2)}b] ${tag}`)
  console.log(`         city: ${JSON.stringify(p.oldCity).slice(0, 66)} → "${p.cleanCity}"`)
  if (p.review) console.log(`         ⚠ REVIEW: ${p.review}`)
}

// redirect map (old geocoded slug → clean slug) — always written; harmless until apply
const redirects = Object.fromEntries(plan.filter((p) => p.oldSlug !== p.cleanSlug).map((p) => [p.oldSlug, p.cleanSlug]))
writeFileSync(join(ROOT, 'lib/location-redirects.json'), JSON.stringify(redirects, null, 2) + '\n')
console.log(`\n📝 wrote lib/location-redirects.json (${Object.keys(redirects).length} entries)`)

if (!APPLY) {
  console.log('\nDry-run only — no DB rows changed. Review the names above (edit CURATED), then re-run with --apply.\n')
  process.exit(0)
}

// ── apply ────────────────────────────────────────────────────────────────────
let renamed = 0, merged = 0, movedBoats = 0
for (const p of plan) {
  if (p.action === 'MERGE') {
    const moved = await rest(`boats?location_id=eq.${p.id}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ location_id: p.twinId }) })
    movedBoats += Array.isArray(moved) ? moved.length : 0
    await rest(`locations?id=eq.${p.id}`, { method: 'DELETE' })
    merged++
    console.log(`  ✓ MERGE ${p.oldSlug} → ${p.cleanSlug} (moved ${Array.isArray(moved) ? moved.length : '?'} boats, deleted shell)`)
  } else {
    await rest(`locations?id=eq.${p.id}`, { method: 'PATCH', body: JSON.stringify({ city: p.cleanCity, name: p.cleanCity, slug: p.cleanSlug }) })
    renamed++
    console.log(`  ✓ RENAME ${p.oldSlug} → ${p.cleanSlug} ("${p.cleanCity}")`)
  }
}
console.log(`\n✅ applied: ${renamed} renamed, ${merged} merged (${movedBoats} boats moved). Redirect map is live once app wiring ships.\n`)
