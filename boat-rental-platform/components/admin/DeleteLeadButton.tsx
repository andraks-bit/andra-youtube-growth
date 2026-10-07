'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Delete a lead (listing_submission). Its boats are kept and just ungrouped.
export default function DeleteLeadButton({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function remove() {
    if (!window.confirm(`Delete the lead “${name}”? This removes the lead only — any boats it has stay under “All boats”. This cannot be undone.`)) return
    setBusy(true)
    try {
      const r = await fetch('/api/admin/delete-lead', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: id }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error || 'Delete failed')
      router.refresh()
    } catch (e) { alert((e as Error).message); setBusy(false) }
  }

  return (
    <button onClick={remove} disabled={busy} title="Delete this lead"
      style={{ fontSize: 11.5, fontWeight: 700, cursor: busy ? 'default' : 'pointer', background: 'transparent', border: '1px solid rgba(248,113,113,0.35)', color: '#f87171', borderRadius: 8, padding: '4px 12px', opacity: busy ? 0.5 : 1, whiteSpace: 'nowrap' }}>
      {busy ? '…' : '🗑 Delete'}
    </button>
  )
}
