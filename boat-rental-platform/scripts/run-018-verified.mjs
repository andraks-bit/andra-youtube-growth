import { readFileSync as __rf } from 'node:fs'
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) { try { for (const l of __rf(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) { const m = l.match(/^\s*SUPABASE_SERVICE_ROLE_KEY\s*=\s*(.+?)\s*$/); if (m) { process.env.SUPABASE_SERVICE_ROLE_KEY = m[1].replace(/^['"]|['"]$/g, ''); break } } } catch {} }
import pg from 'pg'
const { Client } = pg
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const REF = 'xluprzxpuoryiwvxhfgw'
const SQL = `alter table public.listing_submissions add column if not exists verified_2x boolean not null default false;`
const HOSTS = [
  'aws-0-eu-central-1.pooler.supabase.com','aws-0-eu-west-1.pooler.supabase.com','aws-0-eu-west-2.pooler.supabase.com',
  'aws-1-eu-west-1.pooler.supabase.com','aws-1-eu-central-1.pooler.supabase.com','aws-1-eu-north-1.pooler.supabase.com',
  'aws-0-us-east-1.pooler.supabase.com','aws-1-us-east-1.pooler.supabase.com','db.xluprzxpuoryiwvxhfgw.supabase.co',
]
for (const host of HOSTS) {
  const client = new Client({ host, port: host.startsWith('db.') ? 5432 : 6543, database: 'postgres', user: `postgres.${REF}`, password: KEY, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 4000 })
  try {
    await client.connect()
    console.log('Connected via', host)
    await client.query(SQL)
    const r = await client.query("select column_name from information_schema.columns where table_name='listing_submissions' and column_name='verified_2x'")
    console.log('✅ MIGRATION 018 DONE — listing_submissions.verified_2x present:', r.rowCount === 1)
    await client.end(); process.exit(r.rowCount === 1 ? 0 : 2)
  } catch (e) { try { await client.end() } catch {} console.log('  ✗', host, '—', String(e.message).slice(0, 90)) }
}
console.log('❌ pooler unreachable with service key — need Supabase SQL editor'); process.exit(1)
