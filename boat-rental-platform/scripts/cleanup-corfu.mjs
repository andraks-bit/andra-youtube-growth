#!/usr/bin/env node
// Corfu / Costa Boats cleanup (user-approved): delete the 7 stale orphan
// duplicates (submission_id NULL, wrong prices / 1 photo) and publish the
// canonical 8 under the Costa lead (submission a11165c0). Mirrors the admin
// delete-boat endpoint: clear reviews + conversations (no cascade), then delete
// the boat (pricing/images/features cascade). Boats with bookings are kept.
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const JH = { ...H, 'Content-Type': 'application/json' }
const APPLY = process.argv.includes('--apply')
const SUB = 'a11165c0-9d52-4998-ac1a-ee7f89ccfd13'

const ORPHANS = [
  ['766d1bb5-9e69-49a5-a34d-8f98ddc5cd1b', 'Olympic 580cc Plus (corfu-olympic-580cc-plus)'],
  ['42e0b97c-097b-4e65-ba32-a28c3f302c99', 'BMA X222 (corfu-bma-x222)'],
  ['71f928fd-f5d1-486d-aff6-a3908c57bf31', 'Compass 150cc (corfu-compass-150cc)'],
  ['d6b1082a-eed2-4d9d-9f4f-a3c44cf7c558', 'Protagon 20 (corfu-protagon-20)'],
  ['8681b45b-6bdb-433d-8371-6632430cf5b9', 'Mostro Rib (corfu-mostro-rib)'],
  ['eff28cb0-3963-46c8-8667-73609b9a350d', 'Olympic 580cc (corfu-town-olympic-580cc)'],
  ['2f6bc893-25f2-4206-8179-0e4a4263f117', 'Paxos 170 (corfu-town-selva-paxos-170)'],
]

async function del(path) { return fetch(`${SB}/rest/v1/${path}`, { method: 'DELETE', headers: H }) }

let deleted = 0, kept = 0
console.log(`${APPLY ? 'DELETING' : 'DRY — would delete'} ${ORPHANS.length} orphans:`)
for (const [id, label] of ORPHANS) {
  if (!APPLY) { console.log('  •', label); continue }
  await del(`reviews?boat_id=eq.${id}`)
  await del(`conversations?boat_id=eq.${id}`)
  const r = await del(`boats?id=eq.${id}`)
  if (r.ok || r.status === 204) { deleted++; console.log('  ✓ deleted', label) }
  else { kept++; console.error('  ✗ kept', label, '—', (await r.text()).slice(0, 120)) }
}

console.log(`\n${APPLY ? 'PUBLISHING' : 'DRY — would publish'} canonical 8 under Costa lead:`)
if (APPLY) {
  const pub = await fetch(`${SB}/rest/v1/boats?submission_id=eq.${SUB}`, {
    method: 'PATCH', headers: { ...JH, Prefer: 'return=representation' }, body: JSON.stringify({ status: 'active' }),
  })
  if (!pub.ok) console.error('  ✗ publish failed:', (await pub.text()).slice(0, 160))
  else { const rows = await pub.json(); console.log(`  ✓ set ${rows.length} boats → active`) }
}
console.log(`\n${APPLY ? `DONE: ${deleted} deleted, ${kept} kept.` : 'DRY RUN. Re-run with --apply.'}`)
