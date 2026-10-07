'use client'

import { useState } from 'react'

interface Key { id: string; key: string; label: string | null; active: boolean; created_at: string; last_used_at: string | null }

const gold = '#74cfe8', muted = 'rgba(244,244,242,0.55)', text = '#f4f4f2'

export default function AdminApiKeyButton({ userId, userName }: { userId: string; userName?: string }) {
  const [open, setOpen] = useState(false)
  const [keys, setKeys] = useState<Key[]>([])
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function load() {
    const r = await fetch('/api/admin/api-keys')
    const j = await r.json().catch(() => ({}))
    setKeys((j.keys ?? []).filter((k: any) => k.host_id === userId))
    setLoaded(true)
  }
  function toggle() {
    const next = !open
    setOpen(next)
    if (next && !loaded) load()
  }
  async function generate() {
    setBusy(true); setErr(null); setCreated(null)
    try {
      const r = await fetch('/api/admin/api-keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostId: userId, label: userName || '' }) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Failed')
      setCreated(j.key.key)
      await load()
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  async function revoke(id: string, active: boolean) {
    await fetch('/api/admin/api-keys', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, active }) })
    load()
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={toggle}
        title={`API keys for ${userName ?? 'this host'}`}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, background: 'rgba(116,207,232,0.12)', border: '1px solid rgba(116,207,232,0.32)', color: gold, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
      >🔑 API{keys.length ? ` (${keys.filter((k) => k.active).length})` : ''}</button>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50, width: 320, background: '#0c1828', border: '1px solid rgba(116,207,232,0.3)', borderRadius: 12, padding: 14, boxShadow: '0 16px 40px rgba(0,0,0,0.5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: text }}>Partner API keys</span>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: 16 }}>×</button>
          </div>
          <p style={{ fontSize: 11, color: muted, margin: '0 0 10px', lineHeight: 1.5 }}>
            A key shares this host&apos;s active fleet via <code style={{ color: gold }}>GET /api/v1/boats</code>.
          </p>
          <button onClick={generate} disabled={busy} style={{ width: '100%', padding: '8px', borderRadius: 8, background: gold, color: '#07101e', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1, marginBottom: 10 }}>{busy ? 'Generating…' : '+ Generate new key'}</button>
          {err && <p style={{ color: '#f87171', fontSize: 11, margin: '0 0 8px' }}>{err}</p>}
          {created && (
            <div style={{ background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: '#22c55e', fontWeight: 700, marginBottom: 4 }}>Copy now:</div>
              <code style={{ display: 'block', wordBreak: 'break-all', color: text, fontSize: 11 }}>{created}</code>
            </div>
          )}
          {!loaded ? (
            <p style={{ fontSize: 11, color: muted }}>Loading…</p>
          ) : keys.length === 0 ? (
            <p style={{ fontSize: 11, color: muted }}>No keys yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {keys.map((k) => (
                <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 11, opacity: k.active ? 1 : 0.5 }}>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontFamily: 'monospace', color: muted }}>{k.key.slice(0, 10)}…{k.key.slice(-4)}</div>
                    <div style={{ color: muted, fontSize: 10 }}>{k.active ? 'active' : 'revoked'} · used {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString('en-GB') : 'never'}</div>
                  </div>
                  <button onClick={() => revoke(k.id, !k.active)} style={{ flexShrink: 0, padding: '4px 8px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.18)', color: muted, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>{k.active ? 'Revoke' : 'On'}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
