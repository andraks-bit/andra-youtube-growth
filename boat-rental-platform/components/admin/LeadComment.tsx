'use client'

import { useState } from 'react'

const gold = '#74cfe8', muted = 'rgba(244,244,242,0.55)'
const border = 'rgba(116,207,232,0.22)'

// Inline comment on a lead card — free-text note for the team ("waiting for
// photos", "wants 20% margin", …). Saves to listing_submissions.note.
export default function LeadComment({ id, note }: { id: string; note: string | null }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(note ?? '')
  const [saved, setSaved] = useState(note ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    setBusy(true); setErr(null)
    try {
      const r = await fetch('/api/admin/list-submissions', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, note: val }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Failed')
      setSaved(j.lead.note ?? '')
      setVal(j.lead.note ?? '')
      setEditing(false)
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  if (editing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '2px 0 10px', maxWidth: 560 }}>
        <textarea
          value={val}
          onChange={(e) => setVal(e.target.value)}
          rows={3}
          autoFocus
          placeholder="Comment for the team — e.g. waiting for photos, special margin, follow up next week…"
          style={{ padding: '9px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.14)', color: '#f4f4f2', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.55 }}
        />
        {err && <span style={{ color: '#f87171', fontSize: 12 }}>{err}</span>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={save} disabled={busy} style={{ padding: '6px 14px', borderRadius: 8, background: gold, color: '#07101e', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>{busy ? 'Saving…' : 'Save comment'}</button>
          <button onClick={() => { setEditing(false); setVal(saved) }} style={{ padding: '6px 12px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.18)', color: muted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ margin: '0 0 10px', display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
      {saved
        ? <p style={{ fontSize: 13, color: muted, margin: 0, fontStyle: 'italic', whiteSpace: 'pre-wrap', maxWidth: 640 }}>💬 {saved}</p>
        : null}
      <button onClick={() => setEditing(true)} style={{ padding: '3px 10px', borderRadius: 7, background: 'transparent', border: `1px solid ${border}`, color: gold, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
        {saved ? '✏ Edit comment' : '💬 Add comment'}
      </button>
    </div>
  )
}
