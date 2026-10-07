'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, Rss, Loader2, CheckCircle, AlertCircle, Code2 } from 'lucide-react'

const gold = '#74cfe8'
const text = '#f4f4f2'
const muted = 'rgba(244,244,242,0.55)'
const card = '#0c1828'
const inputBg = 'rgba(255,255,255,0.05)'
const inputBorder = 'rgba(255,255,255,0.14)'

type Loc = { id: string; name: string; city: string; country: string }

const SAMPLE = `{
  "boats": [
    {
      "external_id": "SKU-001",
      "name": "Sunseeker Predator 60",
      "type": "motor_yacht",
      "length_m": 18.3,
      "capacity_pax": 10,
      "departure_port": "Puerto Banús",
      "description": "...",
      "currency": "EUR",
      "pricing": [
        { "duration_hours": 4, "price": 2200 },
        { "duration_hours": 8, "price": 3800 }
      ],
      "images": ["https://yoursite.com/boat1-a.jpg", "https://yoursite.com/boat1-b.jpg"],
      "features": ["Skipper", "Fuel", "Swim platform"]
    }
  ]
}`

export default function FeedConnectClient({ locations }: { locations: Loc[] }) {
  const [feedUrl, setFeedUrl] = useState('')
  const [authHeader, setAuthHeader] = useState('')
  const [authValue, setAuthValue] = useState('')
  const [defaultLocationId, setDefaultLocationId] = useState(locations[0]?.id ?? '')
  const [defaultStatus, setDefaultStatus] = useState<'active' | 'draft'>('active')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [last, setLast] = useState<any>(null)
  const [showFormat, setShowFormat] = useState(false)

  useEffect(() => {
    fetch('/api/host/import-feed').then((r) => r.json()).then((j) => {
      if (j.feed) {
        setLast(j.feed)
        setFeedUrl(j.feed.feed_url ?? '')
        setAuthHeader(j.feed.auth_header ?? '')
        if (j.feed.default_location_id) setDefaultLocationId(j.feed.default_location_id)
        if (j.feed.default_status) setDefaultStatus(j.feed.default_status)
      }
    }).catch(() => {})
  }, [])

  async function importNow() {
    setBusy(true); setError(''); setResult(null)
    try {
      const res = await fetch('/api/host/import-feed', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedUrl, authHeader, authValue, defaultLocationId, defaultStatus }),
      })
      const j = await res.json()
      if (!res.ok) { setError(j.error ?? 'Import failed'); return }
      setResult(j)
    } catch { setError('Network error — please try again.') }
    finally { setBusy(false) }
  }

  const label: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }
  const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: '10px', background: inputBg, border: `1px solid ${inputBorder}`, color: text, fontSize: '14px', outline: 'none' }

  return (
    <div style={{ background: '#07101e', minHeight: '100vh', color: text }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 20px 80px' }}>
        <Link href="/host/fleet" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: muted, textDecoration: 'none', marginBottom: '26px' }}>
          <ChevronLeft style={{ width: 15, height: 15 }} /> Fleet Manager
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
          <div style={{ width: 48, height: 48, borderRadius: '14px', background: 'rgba(116,207,232,0.10)', border: '1px solid rgba(116,207,232,0.24)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Rss style={{ width: 22, height: 22, color: gold }} />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0 }}>Connect your boat feed</h1>
            <p style={{ fontSize: '14px', color: muted, margin: '2px 0 0' }}>Already list your boats elsewhere? Pull your whole fleet in via your API.</p>
          </div>
        </div>

        {last?.last_synced_at && (
          <div style={{ margin: '18px 0', padding: '12px 16px', borderRadius: '10px', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.22)', fontSize: '13px', color: muted }}>
            Last sync: <strong style={{ color: text }}>{last.last_status}</strong> · {new Date(last.last_synced_at).toLocaleString('en-GB')}
          </div>
        )}

        <div style={{ background: card, border: '1px solid rgba(116,207,232,0.18)', borderRadius: '18px', padding: '24px', marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={label}>Your feed URL *</label>
            <input value={feedUrl} onChange={(e) => setFeedUrl(e.target.value)} placeholder="https://yoursite.com/api/boats.json" style={input} />
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 160px' }}>
              <label style={label}>Auth header (optional)</label>
              <input value={authHeader} onChange={(e) => setAuthHeader(e.target.value)} placeholder="X-API-Key" style={input} />
            </div>
            <div style={{ flex: '2 1 220px' }}>
              <label style={label}>Auth key / token (optional)</label>
              <input value={authValue} onChange={(e) => setAuthValue(e.target.value)} placeholder="your-secret-key" autoComplete="off" style={input} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: '2 1 220px' }}>
              <label style={label}>Default location</label>
              <select value={defaultLocationId} onChange={(e) => setDefaultLocationId(e.target.value)} style={{ ...input, cursor: 'pointer', colorScheme: 'dark' }}>
                {locations.map((l) => <option key={l.id} value={l.id} style={{ background: card }}>{l.city}, {l.country}</option>)}
              </select>
            </div>
            <div style={{ flex: '1 1 140px' }}>
              <label style={label}>Imported boats are</label>
              <select value={defaultStatus} onChange={(e) => setDefaultStatus(e.target.value as any)} style={{ ...input, cursor: 'pointer', colorScheme: 'dark' }}>
                <option value="active" style={{ background: card }}>Live (active)</option>
                <option value="draft" style={{ background: card }}>Drafts (review first)</option>
              </select>
            </div>
          </div>

          {error && <div style={{ padding: '11px 14px', borderRadius: '10px', background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.30)', color: '#fca5a5', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}><AlertCircle style={{ width: 15, height: 15, flexShrink: 0, marginTop: 1 }} /> {error}</div>}
          {result && (
            <div style={{ padding: '14px 16px', borderRadius: '10px', background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.30)', color: '#86efac', fontSize: '13px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontWeight: 700, marginBottom: '4px' }}><CheckCircle style={{ width: 15, height: 15 }} /> Imported from {result.found} boats in your feed</div>
              <div style={{ color: muted }}>{result.imported} new · {result.updated} updated{result.errors ? ` · ${result.errors} skipped` : ''}. <Link href="/host/fleet" style={{ color: gold }}>View fleet →</Link></div>
              {result.errorSample?.length ? <div style={{ color: '#fca5a5', marginTop: '6px', fontSize: '12px' }}>e.g. {result.errorSample[0]}</div> : null}
            </div>
          )}

          <button onClick={importNow} disabled={busy || !feedUrl}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, #8fdcf0 0%, #74cfe8 60%, #4fb8d6 100%)', color: '#07101e', fontSize: '15px', fontWeight: 800, border: 'none', cursor: busy || !feedUrl ? 'default' : 'pointer', opacity: busy || !feedUrl ? 0.7 : 1 }}>
            {busy ? <><Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> Importing…</> : <>Import my fleet now</>}
          </button>
        </div>

        <button onClick={() => setShowFormat((s) => !s)} style={{ marginTop: '20px', display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'none', border: 'none', color: gold, fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
          <Code2 style={{ width: 15, height: 15 }} /> {showFormat ? 'Hide' : 'Show'} the expected feed format
        </button>
        {showFormat && (
          <div style={{ marginTop: '12px' }}>
            <p style={{ fontSize: '13px', color: muted, lineHeight: 1.6, marginBottom: '10px' }}>
              Your URL should return JSON like below (we accept common field aliases — <code>title/name</code>, <code>guests/capacity</code>, <code>photos/images</code>, etc.). Re-importing updates existing boats by <code>external_id</code> — no duplicates. Want a live example? See our own feed at <code style={{ color: gold }}>/api/feed/boats</code>.
            </p>
            <pre style={{ background: '#0a1420', border: `1px solid ${inputBorder}`, borderRadius: '12px', padding: '16px', fontSize: '12px', color: 'rgba(244,244,242,0.8)', overflowX: 'auto', lineHeight: 1.5 }}>{SAMPLE}</pre>
          </div>
        )}

        <MMKSection locations={locations} defaultLocationId={defaultLocationId} />

        <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg) } }' }} />
      </div>
    </div>
  )
}

// ── MMK Booking Manager sync ─────────────────────────────────────────────────
// Charter fleets managed in booking-manager.com connect with their MMK API key
// (Booking Manager portal → My Account → API Integration) + company ID. Yachts
// upsert by external_id mmk:<id>, so re-running keeps the fleet in sync.
function MMKSection({ locations, defaultLocationId }: { locations: Loc[]; defaultLocationId: string }) {
  const [apiKey, setApiKey] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [locationId, setLocationId] = useState(defaultLocationId)
  const [status, setStatus] = useState<'active' | 'draft'>('active')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ yachts: number; imported: number; updated: number; photos: number } | null>(null)

  useEffect(() => { if (!locationId && defaultLocationId) setLocationId(defaultLocationId) }, [defaultLocationId, locationId])

  async function sync() {
    setBusy(true); setError(''); setResult(null)
    try {
      const res = await fetch('/api/host/import-mmk', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, companyId, locationId, status }),
      })
      const j = await res.json()
      if (!res.ok || j.error) { setError(j.error ?? 'Sync failed'); return }
      setResult(j)
    } catch { setError('Network error — please try again.') }
    finally { setBusy(false) }
  }

  const label: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }
  const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: '10px', background: inputBg, border: `1px solid ${inputBorder}`, color: text, fontSize: '14px', outline: 'none' }

  return (
    <div style={{ marginTop: '34px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
        <div style={{ width: 48, height: 48, borderRadius: '14px', background: 'rgba(116,207,232,0.10)', border: '1px solid rgba(116,207,232,0.24)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⚓</div>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>MMK Booking Manager</h2>
          <p style={{ fontSize: '14px', color: muted, margin: '2px 0 0' }}>Fleet in Booking Manager? Sync yachts, photos and specs straight from MMK.</p>
        </div>
      </div>
      <div style={{ background: card, border: '1px solid rgba(116,207,232,0.18)', borderRadius: '18px', padding: '24px', marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <p style={{ fontSize: '13px', color: muted, margin: 0, lineHeight: 1.6 }}>
          In the <strong style={{ color: text }}>Booking Manager portal</strong> go to <strong style={{ color: text }}>My Account → API Integration</strong> and generate an API key, then paste it here with your MMK Company ID. Re-running the sync updates your fleet — no duplicates.
        </p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: '2 1 240px' }}>
            <label style={label}>MMK API key *</label>
            <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Bearer key from Booking Manager" autoComplete="off" style={input} />
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label style={label}>Company ID</label>
            <input value={companyId} onChange={(e) => setCompanyId(e.target.value)} placeholder="e.g. 4021" style={input} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: '2 1 220px' }}>
            <label style={label}>Fleet location</label>
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)} style={{ ...input, cursor: 'pointer', colorScheme: 'dark' }}>
              {locations.map((l) => <option key={l.id} value={l.id} style={{ background: card }}>{l.city}, {l.country}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label style={label}>Imported boats are</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as 'active' | 'draft')} style={{ ...input, cursor: 'pointer', colorScheme: 'dark' }}>
              <option value="active" style={{ background: card }}>Live (active)</option>
              <option value="draft" style={{ background: card }}>Drafts (review first)</option>
            </select>
          </div>
        </div>
        {error && <div style={{ padding: '11px 14px', borderRadius: '10px', background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.30)', color: '#fca5a5', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}><AlertCircle style={{ width: 15, height: 15, flexShrink: 0, marginTop: 1 }} /> {error}</div>}
        {result && (
          <div style={{ padding: '14px 16px', borderRadius: '10px', background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.30)', color: '#86efac', fontSize: '13px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontWeight: 700, marginBottom: '4px' }}><CheckCircle style={{ width: 15, height: 15 }} /> Synced {result.yachts} yachts from MMK</div>
            <div style={{ color: muted }}>{result.imported} new · {result.updated} updated · {result.photos} photos. <Link href="/host/fleet" style={{ color: gold }}>View fleet →</Link></div>
          </div>
        )}
        <button onClick={sync} disabled={busy || !apiKey}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, #8fdcf0 0%, #74cfe8 60%, #4fb8d6 100%)', color: '#07101e', fontSize: '15px', fontWeight: 800, border: 'none', cursor: busy || !apiKey ? 'default' : 'pointer', opacity: busy || !apiKey ? 0.7 : 1 }}>
          {busy ? <><Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> Syncing from MMK…</> : <>Sync my MMK fleet</>}
        </button>
      </div>
    </div>
  )
}
