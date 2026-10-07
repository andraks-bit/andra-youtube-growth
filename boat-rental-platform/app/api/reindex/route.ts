import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'

export const runtime = 'nodejs'
export const maxDuration = 60

const KEY = 'CF4FA3F0F1CEAC43E77E46C1D522ABCF'
const HOST = 'boathire24.com'
const BASE = `https://${HOST}`

// Pull every URL from the live sitemap so newly generated pages are always covered.
async function sitemapUrls(): Promise<string[]> {
  try {
    const res = await fetch(`${BASE}/sitemap.xml`, { cache: 'no-store' })
    if (!res.ok) return [BASE]
    const xml = await res.text()
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim())
    return urls.length ? urls : [BASE]
  } catch {
    return [BASE]
  }
}

// ── IndexNow (Bing, Yandex, Naver, Seznam) ──
async function submitIndexNow(urls: string[]) {
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${BASE}/${KEY}.txt`, urlList: urls }),
  })
  return { ok: res.ok, status: res.status, count: urls.length }
}

// ── Sitemap ping to Bing + Google ──
async function pingSitemaps() {
  const sm = encodeURIComponent(`${BASE}/sitemap.xml`)
  const targets = [
    `https://www.bing.com/ping?sitemap=${sm}`,
    `https://www.google.com/ping?sitemap=${sm}`,
  ]
  const results: Record<string, number> = {}
  await Promise.all(
    targets.map(async (t) => {
      try {
        const r = await fetch(t, { cache: 'no-store' })
        results[new URL(t).host] = r.status
      } catch {
        results[new URL(t).host] = 0
      }
    })
  )
  return results
}

// ── Google Indexing API (URL_UPDATED) ──
// Needs a service-account JSON in env GSC_SA_JSON (raw JSON or base64). The SA email
// must be an Owner of the boathire24.com property in Search Console. No-op if missing.
function b64url(buf: Buffer | string) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function googleAccessToken(sa: { client_email: string; private_key: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/indexing',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  )
  const signingInput = `${header}.${claim}`
  const signature = crypto.createSign('RSA-SHA256').update(signingInput).sign(sa.private_key)
  const jwt = `${signingInput}.${b64url(signature)}`
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`token: ${JSON.stringify(data).slice(0, 200)}`)
  return data.access_token
}

async function submitGoogleIndexing(urls: string[]) {
  const raw = process.env.GSC_SA_JSON
  if (!raw) return { skipped: 'no GSC_SA_JSON' }
  let sa: { client_email: string; private_key: string }
  try {
    const txt = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')
    sa = JSON.parse(txt)
  } catch (e) {
    return { error: `bad GSC_SA_JSON: ${String(e).slice(0, 120)}` }
  }
  const token = await googleAccessToken(sa)
  // Quota is 200/day — cap submissions per run, prioritise the newest pages (sitemap order).
  const batch = urls.slice(0, 190)
  let ok = 0
  for (const url of batch) {
    try {
      const r = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, type: 'URL_UPDATED' }),
      })
      if (r.ok) ok++
    } catch {
      /* keep going */
    }
  }
  return { submitted: batch.length, accepted: ok }
}

export async function GET(req: NextRequest) {
  // Verify Vercel cron secret (Vercel sends Authorization: Bearer <CRON_SECRET>)
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const urls = await sitemapUrls()
    const [indexnow, google, ping] = await Promise.all([
      submitIndexNow(urls),
      submitGoogleIndexing(urls),
      pingSitemaps(),
    ])
    return NextResponse.json({
      ok: true,
      urls_total: urls.length,
      indexnow,
      google,
      sitemap_ping: ping,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
