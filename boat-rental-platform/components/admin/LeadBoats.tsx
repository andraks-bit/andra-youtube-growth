'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const gold = '#74cfe8', muted = 'rgba(244,244,242,0.55)', text = '#f4f4f2'
const border = 'rgba(116,207,232,0.18)'
const red = '#f87171'

export interface LeadBoat { id: string; name: string; status: string; slug: string }
const STATUS_COLOR: Record<string, string> = { active: '#22c55e', draft: '#f59e0b', paused: muted }

function BoatRow({ boat, last }: { boat: LeadBoat; last: boolean }) {
  const router = useRouter()
  const [status, setStatus] = useState(boat.status)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const isActive = status === 'active'

  async function remove() {
    if (!window.confirm(`Delete “${boat.name}”? This permanently removes the listing and cannot be undone.`)) return
    setBusy(true)
    try {
      const r = await fetch('/api/admin/delete-boat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boatId: boat.id }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error || 'Delete failed')
      setDeleted(true)
      router.refresh()
    } catch (e) { alert((e as Error).message); setBusy(false) }
  }

  if (deleted) return null

  async function toggle() {
    setBusy(true); setErr(false)
    const next = isActive ? 'draft' : 'active'
    try {
      const r = await fetch('/api/admin/boat-status', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boatId: boat.id, status: next }),
      })
      if (!r.ok) throw new Error()
      setStatus(next)
      // Resync the server-rendered page data — otherwise Next's client router
      // cache can re-serve the old status ("draft") on the next visit even
      // though the change saved fine.
      router.refresh()
    } catch { setErr(true) } finally { setBusy(false) }
  }

  const c = STATUS_COLOR[status] ?? muted
  return (
    // flexWrap so the actions drop to their own line on phones instead of
    // colliding with the status badge (mobile overlap bug).
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px 10px', flexWrap: 'wrap', padding: '9px 14px', borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0, flex: '1 1 auto' }}>
        <a href={`/boats/${boat.slug}`} target="_blank" rel="noopener" style={{ color: text, fontSize: 13, fontWeight: 600, textDecoration: 'none', overflowWrap: 'anywhere' }}>{boat.name}</a>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(255,255,255,0.06)', color: c, border: '1px solid rgba(255,255,255,0.12)', whiteSpace: 'nowrap', flexShrink: 0 }}>{status}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, marginLeft: 'auto' }}>
        <button onClick={toggle} disabled={busy}
          style={{ fontSize: 11.5, fontWeight: 700, cursor: 'pointer', borderRadius: 8, padding: '5px 12px', opacity: busy ? 0.6 : 1,
            background: isActive ? 'transparent' : '#22c55e',
            color: isActive ? muted : '#07101e',
            border: isActive ? '1px solid rgba(255,255,255,0.18)' : 'none' }}>
          {busy ? '…' : isActive ? 'Unpublish' : err ? 'Retry' : 'Publish'}
        </button>
        <a href={`/boats/${boat.slug}`} target="_blank" rel="noopener" style={{ fontSize: 11.5, color: muted, textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}>Preview ↗</a>
        <a href={`/host/listings/${boat.id}`} style={{ fontSize: 11.5, color: gold, textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}>Edit →</a>
        <button onClick={remove} disabled={busy} title="Delete this boat"
          style={{ fontSize: 11.5, fontWeight: 700, cursor: busy ? 'default' : 'pointer', background: 'transparent', border: 'none', color: red, opacity: busy ? 0.5 : 1, whiteSpace: 'nowrap', padding: 0 }}>Delete</button>
      </div>
    </div>
  )
}

export default function LeadBoats({ boats, label, defaultOpen = false }: { boats: LeadBoat[]; label?: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  if (!boats.length) return null

  return (
    <div style={{ marginTop: 10 }}>
      <button onClick={() => setOpen((o) => !o)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 99, background: 'rgba(116,207,232,0.12)', border: `1px solid ${border}`, color: gold, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
        🛥 {label ?? `${boats.length} boat${boats.length === 1 ? '' : 's'} listed`} {open ? '▴' : '▾'}
      </button>
      {open && (
        <div style={{ marginTop: 8, border: `1px solid ${border}`, borderRadius: 10, overflow: 'hidden' }}>
          {boats.map((b, i) => <BoatRow key={b.id} boat={b} last={i === boats.length - 1} />)}
        </div>
      )}
    </div>
  )
}
