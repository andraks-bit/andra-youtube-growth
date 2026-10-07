'use client'

import { useState } from 'react'

// Admin-only "Verified 2×" mark on a lead — ticked after the lead's boats have
// been manually double-checked. Shows next to the Manual/Email badge.
export default function LeadVerified2x({ id, verified }: { id: string; verified?: boolean | null }) {
  const [on, setOn] = useState(!!verified)
  const [busy, setBusy] = useState(false)

  async function toggle() {
    const next = !on
    setBusy(true)
    setOn(next) // optimistic
    try {
      const r = await fetch('/api/admin/list-submissions', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, verified_2x: next }),
      })
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Failed')
    } catch (e) {
      setOn(!next) // revert
      alert((e as Error).message)
    } finally { setBusy(false) }
  }

  return (
    <label
      title="Tick after the lead's listings have been manually verified twice"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, cursor: busy ? 'default' : 'pointer',
        fontSize: 10.5, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase',
        padding: '2px 8px', borderRadius: 99, opacity: busy ? 0.6 : 1,
        color: on ? '#7fe3aa' : 'rgba(244,244,242,0.45)',
        background: on ? 'rgba(94,214,140,0.12)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${on ? 'rgba(94,214,140,0.32)' : 'rgba(255,255,255,0.12)'}`,
      }}
    >
      <input type="checkbox" checked={on} disabled={busy} onChange={toggle}
        style={{ width: 13, height: 13, accentColor: '#5ed68c', cursor: 'pointer', margin: 0 }} />
      {on ? '✓ Verified 2×' : 'Verified 2×'}
    </label>
  )
}
