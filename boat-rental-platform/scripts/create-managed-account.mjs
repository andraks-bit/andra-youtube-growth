// One-off: create (or fetch) the dedicated "BoatHire24" managed host account.
// Managed boats are owned by this profile; the public sees "Hosted by BoatHire24".
// Uses REST + GoTrue admin APIs directly (no supabase-js → works on Node 20).
// Run AFTER migration 010 is applied:  node scripts/create-managed-account.mjs
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=') && !l.trimStart().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }),
)

const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }
const EMAIL = 'fleet@boathire24.com'

// 1. Already set up?
const existing = await fetch(`${URL_BASE}/rest/v1/profiles?is_managed_account=eq.true&select=id,full_name`, { headers: H }).then((r) => r.json())
if (Array.isArray(existing) && existing.length) {
  console.log('Managed account already exists:', existing[0].id, existing[0].full_name)
  process.exit(0)
}

// 2. Find or create the auth user.
let userId = null
const list = await fetch(`${URL_BASE}/auth/v1/admin/users?per_page=200`, { headers: H }).then((r) => r.json())
const found = (list?.users ?? []).find((u) => u.email === EMAIL)
if (found) {
  userId = found.id
  console.log('Found existing auth user:', userId)
} else {
  const created = await fetch(`${URL_BASE}/auth/v1/admin/users`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ email: EMAIL, email_confirm: true, user_metadata: { full_name: 'BoatHire24' } }),
  }).then((r) => r.json())
  if (!created?.id) { console.error('createUser failed:', JSON.stringify(created)); process.exit(1) }
  userId = created.id
  console.log('Created auth user:', userId)
}

// 3. Upsert profile fields (the on_auth_user_created trigger created the row).
const up = await fetch(`${URL_BASE}/rest/v1/profiles?on_conflict=id`, {
  method: 'POST',
  headers: { ...H, Prefer: 'resolution=merge-duplicates,return=representation' },
  body: JSON.stringify({ id: userId, full_name: 'BoatHire24', is_managed_account: true, verification_status: 'verified', is_admin: false }),
}).then((r) => r.json())
if (!Array.isArray(up) || !up.length) { console.error('profile upsert failed:', JSON.stringify(up)); process.exit(1) }

console.log('✅ BoatHire24 managed account ready:', userId)
