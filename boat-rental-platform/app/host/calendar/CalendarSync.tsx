'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw as SyncIcon, Check, Copy, Loader2, Link2, X } from 'lucide-react'

const gold = '#74cfe8'
const card = '#0c1828'
const border = 'rgba(116,207,232,0.15)'
const text = '#f4f4f2'
const muted = 'rgba(244,244,242,0.55)'
const dim = 'rgba(244,244,242,0.35)'
const inputBg = 'rgba(255,255,255,0.05)'
const inputBorder = 'rgba(255,255,255,0.14)'
const green = '#5ed68c'
const red = '#f87171'

interface Status { icalUrl: string | null; lastSync: string | null; status: string | null; error: string | null; feedUrl: string }

export default function CalendarSync({ boatId, boatName }: { boatId: string; boatName: string }) {
  const router = useRouter()
  const [s, setS] = useState<Status | null>(null)
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let live = true
    fetch(`/api/host/ical?boatId=${boatId}`).then((r) => r.json()).then((d) => {
      if (!live) return
      if (d.feedUrl) { setS(d); setUrl(d.icalUrl ?? '') }
    }).catch(() => {})
    return () => { live = false }
  }, [boatId])

  async function post(body: Record<string, unknown>, label: string) {
    setBusy(label); setMsg(null)
    try {
      const r = await fetch('/api/host/ical', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ boatId, ...body }) })
      const d = await r.json()
      if (body.action === 'disconnect') { setS((p) => p ? { ...p, icalUrl: null, lastSync: null, status: null, error: null } : p); setUrl(''); setMsg({ ok: true, text: 'Calendar disconnected. Imported blocks were removed.' }) }
      else if (d.error) setMsg({ ok: false, text: d.error })
      else { setS((p) => ({ feedUrl: d.feedUrl ?? p?.feedUrl ?? '', icalUrl: d.icalUrl, lastSync: d.lastSync, status: d.status, error: null })); setMsg({ ok: true, text: `Synced — ${d.imported} busy date${d.imported === 1 ? '' : 's'} blocked from your calendar.` }) }
      router.refresh()
    } catch { setMsg({ ok: false, text: 'Something went wrong. Try again.' }) }
    finally { setBusy(null) }
  }

  function copyFeed() {
    if (!s?.feedUrl) return
    navigator.clipboard.writeText(s.feedUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) }).catch(() => {})
  }

  const connected = !!s?.icalUrl
  const box: React.CSSProperties = { flex: 1, padding: '9px 11px', borderRadius: 9, background: inputBg, border: `1px solid ${inputBorder}`, color: text, fontSize: 13, outline: 'none', minWidth: 0 }
  const btn = (bg: string, fg: string): React.CSSProperties => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 9, background: bg, color: fg, border: 'none', fontSize: 13, fontWeight: 700, cursor: busy ? 'default' : 'pointer', whiteSpace: 'nowrap', opacity: busy ? 0.6 : 1 })

  return (
    <div style={{ marginTop: 22, background: card, border: `1px solid ${border}`, borderRadius: 16, padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
        <SyncIcon size={18} color={gold} />
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: text }}>Calendar sync</h3>
      </div>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: muted, lineHeight: 1.5 }}>
        Sync <strong style={{ color: text }}>{boatName}</strong> with iCloud, Google, Airbnb or any other calendar so you never update dates by hand.
      </p>

      {/* IMPORT */}
      <div style={{ fontSize: 12, fontWeight: 800, color: gold, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>1 · Import your calendar → block dates here</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input style={box} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste your iCloud/Google public .ics or webcal:// link" />
        <button style={btn(gold, '#07101e')} disabled={!!busy} onClick={() => post({ url }, 'connect')}>
          {busy === 'connect' ? <Loader2 size={15} className="spin" /> : <Link2 size={15} />}{connected ? 'Update & sync' : 'Connect & sync'}
        </button>
      </div>
      <p style={{ margin: '8px 0 0', fontSize: 11.5, color: dim, lineHeight: 1.5 }}>
        iPhone/Mac: Calendar app → share the calendar → <em>Public Calendar</em> → copy the <code>webcal://…</code> link. We check it daily and whenever you press Sync now.
      </p>

      {connected && (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, color: s?.status === 'error' ? red : muted, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {s?.status === 'error'
              ? <><X size={14} color={red} /> Last sync failed{s?.error ? `: ${s.error}` : ''}</>
              : <><Check size={14} color={green} /> {s?.lastSync ? `Last synced ${new Date(s.lastSync).toLocaleString()}` : 'Connected'}</>}
          </span>
          <button style={btn('transparent', muted)} disabled={!!busy} onClick={() => post({ action: 'sync' }, 'sync')}>
            {busy === 'sync' ? <Loader2 size={14} className="spin" /> : <SyncIcon size={14} />}Sync now
          </button>
          <button style={{ ...btn('transparent', red), border: `1px solid ${inputBorder}` }} disabled={!!busy} onClick={() => post({ action: 'disconnect' }, 'disconnect')}>
            {busy === 'disconnect' ? <Loader2 size={14} className="spin" /> : <X size={14} />}Disconnect
          </button>
        </div>
      )}

      {/* EXPORT */}
      <div style={{ fontSize: 12, fontWeight: 800, color: gold, textTransform: 'uppercase', letterSpacing: 0.4, margin: '20px 0 8px' }}>2 · Subscribe to your BoatHire24 calendar</div>
      <p style={{ margin: '0 0 8px', fontSize: 12.5, color: muted, lineHeight: 1.5 }}>Add this link in iCloud/Google (<em>New Calendar Subscription</em>) to see BoatHire24 bookings in your own calendar:</p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input style={{ ...box, fontFamily: 'monospace', fontSize: 12, color: muted }} readOnly value={s?.feedUrl ?? 'Loading…'} onFocus={(e) => e.currentTarget.select()} />
        <button style={btn(copied ? green : 'rgba(116,207,232,0.14)', copied ? '#07101e' : gold)} onClick={copyFeed} disabled={!s?.feedUrl}>
          {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
        </button>
      </div>

      {msg && <p style={{ margin: '14px 0 0', fontSize: 12.5, color: msg.ok ? green : red }}>{msg.text}</p>}
      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
