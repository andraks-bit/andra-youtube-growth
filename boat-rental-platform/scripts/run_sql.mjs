import { readFileSync as __rfEnv } from 'node:fs'
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) { try { for (const __l of __rfEnv(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) { const __m = __l.match(/^\s*SUPABASE_SERVICE_ROLE_KEY\s*=\s*(.+?)\s*$/); if (__m) { process.env.SUPABASE_SERVICE_ROLE_KEY = __m[1].replace(/^['"]|['"]$/g, ''); break } } } catch {} }
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY (set it in .env.local or the environment).'); process.exit(1) }

import pg from 'pg'
const { Client } = pg

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const PROJECT_REF = 'xluprzxpuoryiwvxhfgw'

// Try new pooler patterns (aws-1, aws-2)
const HOSTS = [
  'aws-1-eu-west-1.pooler.supabase.com',
  'aws-1-eu-central-1.pooler.supabase.com',
  'aws-1-eu-north-1.pooler.supabase.com',
  'aws-1-us-east-1.pooler.supabase.com',
  'aws-1-us-east-2.pooler.supabase.com',
  'aws-1-us-west-1.pooler.supabase.com',
  'aws-2-eu-west-1.pooler.supabase.com',
  'db.xluprzxpuoryiwvxhfgw.supabase.co',
]

for (const host of HOSTS) {
  const client = new Client({
    host,
    port: host.startsWith('db.') ? 5432 : 6543,
    database: 'postgres',
    user: `postgres.${PROJECT_REF}`,
    password: SERVICE_KEY,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 4000,
  })
  try {
    await client.connect()
    console.log('Connected via', host)
    await client.query("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signup_notified BOOLEAN NOT NULL DEFAULT false;")
    console.log('✅ MIGRATION DONE')
    await client.end()
    process.exit(0)
  } catch (e) {
    try { await client.end() } catch {}
    console.log('  ✗', host, '—', String(e.message).slice(0,80))
  }
}
process.exit(1)
