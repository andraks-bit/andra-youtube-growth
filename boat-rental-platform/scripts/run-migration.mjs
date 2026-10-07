import { readFileSync as __rfEnv } from 'node:fs'
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) { try { for (const __l of __rfEnv(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) { const __m = __l.match(/^\s*SUPABASE_SERVICE_ROLE_KEY\s*=\s*(.+?)\s*$/); if (__m) { process.env.SUPABASE_SERVICE_ROLE_KEY = __m[1].replace(/^['"]|['"]$/g, ''); break } } } catch {} }
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY (set it in .env.local or the environment).'); process.exit(1) }

/**
 * Applies the verification/admin schema migration via Supabase connection pooler.
 * The service_role JWT is used as the PostgreSQL password with Supavisor JWT auth.
 *
 * Usage: node scripts/run-migration.mjs
 */
import pg from 'pg'
const { Client } = pg

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const PROJECT_REF = 'xluprzxpuoryiwvxhfgw'

const SQL = `
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified','pending','verified','rejected')),
  ADD COLUMN IF NOT EXISTS verification_notes  TEXT,
  ADD COLUMN IF NOT EXISTS is_admin            BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at         TIMESTAMPTZ;
`

const REGIONS = ['eu-central-1', 'eu-west-1', 'eu-west-2', 'us-east-1', 'us-west-1', 'ap-southeast-1']

for (const region of REGIONS) {
  const host = `aws-0-${region}.pooler.supabase.com`
  const client = new Client({
    host,
    port: 6543,
    database: 'postgres',
    user: `postgres.${PROJECT_REF}`,
    password: SERVICE_KEY,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
    query_timeout: 10000,
  })

  try {
    console.log(`Trying ${region}...`)
    await client.connect()
    console.log(`Connected via ${region}!`)
    await client.query(SQL)
    console.log('✅ Migration applied successfully!')
    await client.end()
    process.exit(0)
  } catch (err) {
    try { await client.end() } catch {}
    console.log(`  ✗ ${err.message?.slice(0, 80)}`)
  }
}

console.log('\n❌ Could not connect via pooler. The service_role JWT may not be accepted as the DB password.')
console.log('Please run this SQL in the Supabase dashboard SQL editor:')
console.log('https://supabase.com/dashboard/project/xluprzxpuoryiwvxhfgw/sql/new')
console.log('\n' + SQL)
