// One-off: create (or fetch) the dedicated "Blue Cruise Bodrum" operator host
// account. Their gulets are owned by this profile; the public sees
// "Hosted by Blue Cruise Bodrum". Contact: sales@bluecruisebodrum.com.
// Mirrors create-managed-account.mjs (REST + GoTrue admin APIs, no supabase-js).
//   node scripts/create-bluecruise-account.mjs
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=') && !l.trimStart().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }),
)

const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }
const EMAIL = 'sales@bluecruisebodrum.com'
const NAME = 'Blue Cruise Bodrum'

// 1. Find or create the auth user (no password — operator resets to claim, same
//    as every other imported operator account).
let userId = null
const list = await fetch(`${URL_BASE}/auth/v1/admin/users?per_page=200`, { headers: H }).then((r) => r.json())
const found = (list?.users ?? []).find((u) => u.email === EMAIL)
if (found) {
  userId = found.id
  console.log('Found existing auth user:', userId)
} else {
  const created = await fetch(`${URL_BASE}/auth/v1/admin/users`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ email: EMAIL, email_confirm: true, user_metadata: { full_name: NAME } }),
  }).then((r) => r.json())
  if (!created?.id) { console.error('createUser failed:', JSON.stringify(created)); process.exit(1) }
  userId = created.id
  console.log('Created auth user:', userId)
}

// 2. Upsert profile (the on_auth_user_created trigger created the row).
const up = await fetch(`${URL_BASE}/rest/v1/profiles?on_conflict=id`, {
  method: 'POST',
  headers: { ...H, Prefer: 'resolution=merge-duplicates,return=representation' },
  body: JSON.stringify({
    id: userId, full_name: NAME, is_managed_account: false,
    verification_status: 'verified', is_admin: false,
    bio: 'Crewed gulet, motoryacht and sailing charters on the Turkish Aegean coast, based in Bodrum.',
  }),
}).then((r) => r.json())
if (!Array.isArray(up) || !up.length) { console.error('profile upsert failed:', JSON.stringify(up)); process.exit(1) }

console.log('BLUECRUISE_HOST_ID=' + userId)
console.log('Blue Cruise Bodrum host account ready:', userId)
