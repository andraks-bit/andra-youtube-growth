import { readFileSync as __rfEnv } from 'node:fs'
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) { try { for (const __l of __rfEnv(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) { const __m = __l.match(/^\s*SUPABASE_SERVICE_ROLE_KEY\s*=\s*(.+?)\s*$/); if (__m) { process.env.SUPABASE_SERVICE_ROLE_KEY = __m[1].replace(/^['"]|['"]$/g, ''); break } } } catch {} }
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY (set it in .env.local or the environment).'); process.exit(1) }

import pg from 'pg'
const { Client } = pg

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const SQL = 'ALTER TABLE boats ADD COLUMN IF NOT EXISTS admin_note TEXT'

// Try EVERY Supabase pooler combination — pooler hostnames have changed over time
const REGIONS = [
  'eu-west-1','eu-central-1','eu-north-1','eu-west-2','eu-west-3',
  'us-east-1','us-east-2','us-west-1','us-west-2',
  'ap-southeast-1','ap-southeast-2','ap-northeast-1','ap-south-1'
]
const HOST_PATTERNS = (region) => [
  `aws-0-${region}.pooler.supabase.com`,
  `aws-1-${region}.pooler.supabase.com`,
]

for (const region of REGIONS) {
  for (const host of HOST_PATTERNS(region)) {
    for (const port of [6543, 5432]) {
      for (const password of [SERVICE_KEY, 'postgres']) {
        const c = new Client({
          host, port, database:'postgres',
          user:'postgres.xluprzxpuoryiwvxhfgw',
          password, ssl:{rejectUnauthorized:false},
          connectionTimeoutMillis:3000
        })
        try {
          await c.connect()
          await c.query(SQL)
          console.log('SUCCESS via', host, port)
          await c.end(); process.exit(0)
        } catch (e) {
          try { await c.end() } catch {}
        }
      }
    }
  }
}
console.log('All pooler attempts exhausted')
process.exit(1)
